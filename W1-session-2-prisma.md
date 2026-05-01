# W1 세션 2 — Prisma 스키마 + DB 셋업

> 세션 1이 끝난 뒤 새 세션을 열고, 아래 본문을 그대로 붙여넣으세요.
> `.env.local`이 채워져 있어야 마이그레이션이 돕니다.

---

## Claude Code 프롬프트

이전 세션에서 Next.js 부트스트랩이 끝났습니다. CLAUDE.md를 다시 읽고
이번 세션을 시작합니다.

이번 세션의 목표는 Prisma 스키마 도입과 마이그레이션입니다. 셔틀이는
실시간 GPS 추적이 핵심 기능이므로 위치 관련 모델이 처음부터 들어갑니다.

1. Prisma 설치 및 초기화.
   - `prisma`, `@prisma/client` 설치
   - `pnpm prisma init --datasource-provider postgresql`
   - `schema.prisma`의 datasource 블록을 다음으로 교체:
     ```
     url       = env("DATABASE_URL")  // pooler
     directUrl = env("DIRECT_URL")    // migrations
     ```
   - generator client에 `previewFeatures = ["fullTextSearchPostgres"]` 추가.

2. 도메인 스키마 작성. 아래 모델을 모두 `schema.prisma`에 추가합니다.
   (이 프롬프트 끝에 첨부된 schema.prisma 전체를 그대로 사용)

3. `src/lib/db.ts` 생성. Prisma Client 싱글톤 패턴 (Next.js dev 핫리로드
   대응). 글로벌 객체 사용.

4. 마이그레이션.
   - `pnpm prisma migrate dev --name init` 실행.
   - 성공하면 `prisma/migrations/` 디렉토리 생성 확인.
   - DB에 모든 테이블 생성 확인 (Prisma Studio로 빠르게 확인).
   - **LocationPing 테이블의 `(tripId, recordedAt)` 인덱스가 생성됐는지 확인.**
     이 인덱스가 없으면 학부모 실시간 지도 쿼리가 느려집니다.

5. 시드 스크립트 `prisma/seed.ts`.
   - 데모용 학원 1개 (혼합형: 학원 겸 어린이집 같은 다양성 보여주기 위해
     KIDS 1대 + GENERAL 1대).
   - 노선 2개 (등원·하원), 정류장 4개 (실제 카카오맵에서 사용 가능한
     좌표값으로: 예 서울 강남역 부근 좌표 lat=37.4979, lng=127.0276 베이스로
     인근 4지점).
   - 정류장 `radiusM`은 50m 기본값.
   - 데모 학생 5명 + 보호자 5명.
   - 기사 1명, 동승자 1명, 학원장 1명 (Staff 테이블).
   - 명시적으로 "데모 데이터"라는 표시를 name 필드에 포함.
   - `package.json`에 `prisma.seed = "tsx prisma/seed.ts"` 등록.
   - `pnpm prisma db seed` 실행 성공 확인.

6. 커밋:
   - `chore: install prisma + db client singleton`
   - `feat: domain schema with realtime gps support`
   - `feat: seed script with demo data including stops`

작업이 끝나면 다음을 보고:

- 생성된 테이블 목록
- 시드 데이터 요약 (몇 건씩 들어갔는지)
- 다음 세션 인증 작업에서 결정할 것들 (예: 학원장 첫 가입 시
  Organization을 함께 만들지, 초대 받아 들어올지 등)

---

## 첨부: schema.prisma 전체

아래를 `prisma/schema.prisma`에 그대로 작성합니다 (datasource·generator
블록은 위 1번 단계에서 이미 설정한 것 유지).

```prisma
// === 테넌트 ===
model Organization {
  id        String   @id @default(cuid())
  name      String
  type      OrgType  @default(ACADEMY)
  plan      Plan     @default(TRIAL)
  createdAt DateTime @default(now())

  vehicles Vehicle[]
  students Student[]
  staffs   Staff[]
  stops    Stop[]
}

enum OrgType {
  ACADEMY      // 학원·교습소
  DAYCARE      // 어린이집
  KINDERGARTEN // 유치원
}

enum Plan {
  TRIAL
  BASIC
  PRO
}

// === 차량·운영자 ===
model Vehicle {
  id             String       @id @default(cuid())
  orgId          String
  org            Organization @relation(fields: [orgId], references: [id])
  plate          String       // 차량번호
  mode           VehicleMode  @default(GENERAL)
  // KIDS 모드 전용 필드 (nullable)
  reportNo       String?      // 어린이통학버스 신고증명서 번호
  insuranceUntil DateTime?    // 보험 만료일

  routes Route[]
  trips  Trip[]
}

enum VehicleMode {
  KIDS
  GENERAL
}

model Staff {
  id     String       @id @default(cuid())
  orgId  String
  org    Organization @relation(fields: [orgId], references: [id])
  userId String?      // Supabase auth.users 연결
  name   String
  phone  String
  role   StaffRole

  trainings   TrainingRecord[]
  driverTrips Trip[]           @relation("DriverTrips")
  helperTrips Trip[]           @relation("HelperTrips")
}

enum StaffRole {
  OWNER
  DRIVER
  HELPER
}

// 안전교육 이수 기록 (운영자·운전자·동승자 2년마다)
model TrainingRecord {
  id             String           @id @default(cuid())
  staffId        String
  staff          Staff            @relation(fields: [staffId], references: [id])
  category       TrainingCategory
  completedOn    DateTime
  expiresOn      DateTime         // completedOn + 2년 (해당 연도 12/31)
  certificateUrl String?
}

enum TrainingCategory {
  OPERATOR
  DRIVER
  HELPER
}

// === 노선·정류장 ===
model Route {
  id        String         @id @default(cuid())
  vehicleId String
  vehicle   Vehicle        @relation(fields: [vehicleId], references: [id])
  name      String         // "월수금 등원 1코스"
  direction RouteDirection
  weekdays  Int            // 비트마스크: 월=1 화=2 수=4 목=8 금=16 토=32 일=64

  stops    RouteStop[]
  students RouteStudent[]
  trips    Trip[]
}

enum RouteDirection {
  PICKUP   // 등원
  DROPOFF  // 하원
}

model Stop {
  id      String       @id @default(cuid())
  orgId   String
  org     Organization @relation(fields: [orgId], references: [id])
  name    String       // "○○아파트 정문"
  lat     Float
  lng     Float
  radiusM Int          @default(50)  // 도착 판정 반경 (미터)

  routes   RouteStop[]
  students RouteStudent[]
}

model RouteStop {
  id          String @id @default(cuid())
  routeId     String
  route       Route  @relation(fields: [routeId], references: [id])
  stopId      String
  stop        Stop   @relation(fields: [stopId], references: [id])
  order       Int    // 순서
  scheduledAt String // "HH:mm" 형식 예정 시각

  @@unique([routeId, order])
}

// === 학생·보호자 ===
model Student {
  id        String       @id @default(cuid())
  orgId     String
  org       Organization @relation(fields: [orgId], references: [id])
  name      String
  birthYear Int          // KIDS 모드 자동 판정용

  guardians GuardianLink[]
  routes    RouteStudent[]
  events    BoardingEvent[]
  absences  AbsenceRequest[]
}

model Guardian {
  id     String         @id @default(cuid())
  userId String?        // Supabase auth (학부모 본인 계정)
  name   String
  phone  String         @unique

  links GuardianLink[]
}

model GuardianLink {
  id         String   @id @default(cuid())
  studentId  String
  student    Student  @relation(fields: [studentId], references: [id])
  guardianId String
  guardian   Guardian @relation(fields: [guardianId], references: [id])
  relation   String   // "모", "부", "조부" 등
  isPrimary  Boolean  @default(false)

  @@unique([studentId, guardianId])
}

model RouteStudent {
  id        String  @id @default(cuid())
  routeId   String
  route     Route   @relation(fields: [routeId], references: [id])
  studentId String
  student   Student @relation(fields: [studentId], references: [id])
  stopId    String  // 이 학생이 타고 내리는 정류장
  stop      Stop    @relation(fields: [stopId], references: [id])

  @@unique([routeId, studentId])
}

// === 일별 운행 ===
model Trip {
  id        String    @id @default(cuid())
  vehicleId String
  vehicle   Vehicle   @relation(fields: [vehicleId], references: [id])
  routeId   String
  route     Route     @relation(fields: [routeId], references: [id])
  driverId  String
  driver    Staff     @relation("DriverTrips", fields: [driverId], references: [id])
  helperId  String?
  helper    Staff?    @relation("HelperTrips", fields: [helperId], references: [id])
  date      DateTime  @db.Date
  startedAt DateTime?
  endedAt   DateTime?

  // 운행 시작·종료 위치 (요약용, 상세 트랙은 LocationPing)
  startLat Float?
  startLng Float?
  endLat   Float?
  endLng   Float?

  events      BoardingEvent[]
  safetyCheck SafetyCheck?
  pings       LocationPing[]

  @@unique([vehicleId, routeId, date])
}

model BoardingEvent {
  id        String       @id @default(cuid())
  tripId    String
  trip      Trip         @relation(fields: [tripId], references: [id])
  studentId String
  student   Student      @relation(fields: [studentId], references: [id])
  type      BoardingType
  at        DateTime     @default(now())
  lat       Float?
  lng       Float?
  notes     String?
}

enum BoardingType {
  BOARD
  ALIGHT
}

// 운행 중 위치 ping (영구 저장, 면책 자료)
// 영구 저장 정책: 30초 간격 + 정류장 통과 시점 + 시작/종료
// (실시간 broadcast는 DB 거치지 않고 Supabase Realtime broadcast 채널 사용)
model LocationPing {
  id         String     @id @default(cuid())
  tripId     String
  trip       Trip       @relation(fields: [tripId], references: [id])
  lat        Float
  lng        Float
  accuracy   Float?     // GPS 정확도 (미터)
  speed      Float?     // 속도 (m/s)
  heading    Float?     // 진행 방향 0~360
  recordedAt DateTime   @default(now())
  source     PingSource @default(INTERVAL)

  @@index([tripId, recordedAt])
}

enum PingSource {
  INTERVAL    // 30초 간격 자동
  STOP_PASS   // 정류장 반경 진입 (자동 판정)
  START       // 운행 시작 시점
  END         // 운행 종료 시점
}

// KIDS 모드: 매 운행 안전점검 (도교법 §53⑦ 안전운행기록 원천 데이터)
model SafetyCheck {
  id                String    @id @default(cuid())
  tripId            String    @unique
  trip              Trip      @relation(fields: [tripId], references: [id])
  seatbeltAllOk     Boolean   // 출발 전 전원 안전띠 확인
  seatbeltCheckedAt DateTime?
  helperPresent     Boolean   // 동승보호자 동승 확인
  allAlightedOk     Boolean   // 운행 종료 후 전원 하차 확인
  alightCheckedAt   DateTime?
}

// 결석·일시 불승차 신청
model AbsenceRequest {
  id        String        @id @default(cuid())
  studentId String
  student   Student       @relation(fields: [studentId], references: [id])
  date      DateTime      @db.Date
  type      AbsenceType
  reason    String?
  status    AbsenceStatus @default(PENDING)
  createdBy String        // guardianId
  createdAt DateTime      @default(now())
}

enum AbsenceType {
  ABSENT_BOTH
  ABSENT_PICKUP
  ABSENT_DROPOFF
}

enum AbsenceStatus {
  PENDING
  NOTIFIED_DRIVER
  ACKNOWLEDGED
}
```
