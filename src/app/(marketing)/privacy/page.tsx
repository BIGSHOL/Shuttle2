import {
  LegalList,
  LegalSection,
  LegalShell,
} from "../_components/legal-shell";

export default function PrivacyPage() {
  return (
    <LegalShell
      title="개인정보처리방침"
      effectiveDate="2026-05-04"
      badge="베타 임시본 — 정식 출시 전 법무 검토 예정"
    >
      <LegalSection title="1. 처리 목적">
        <p>
          셔틀이(이하 “회사”)는 다음의 목적으로 개인정보를 처리합니다.
          처리하고 있는 개인정보는 다음 목적 이외의 용도로 이용되지 않으며,
          이용 목적이 변경되는 경우 별도의 동의를 받습니다.
        </p>
        <LegalList
          items={[
            "회원 가입·관리, 본인 확인, 부정 이용 방지",
            "셔틀 운영 서비스 제공(차량·노선 관리, 운행 시작/종료, 안전점검)",
            "기사 폰 GPS 기반 실시간 위치를 학부모에게 전송",
            "도로교통법 §53⑦ 안전운행기록 자동 생성·보관",
            "결석 신청, 정류장 변경 요청 등 학부모-기관 연계 알림",
            "푸시 알림, 이메일을 통한 서비스 안내·중요 공지",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. 수집하는 개인정보 항목">
        <p>회사는 회원 유형별로 다음 정보를 수집합니다.</p>
        <LegalList
          items={[
            <>
              <strong>학원장·원장 / 기사 / 동승보호자</strong>: 이메일, 비밀번호,
              이름, 휴대폰 번호, 소속 기관명, 역할
            </>,
            <>
              <strong>학부모(보호자)</strong>: 이메일, 비밀번호, 이름, 휴대폰
              번호, 자녀와의 관계, 자녀 식별 정보(학원 등록명, 정류장 등)
            </>,
            <>
              <strong>학생·원아</strong>: 이름, 출생연도, 노선·정류장 배정
              정보 (※ 만 13세 미만은 보호자 동의 하에 수집)
            </>,
            <>
              <strong>운행 데이터</strong>: 안전점검 항목(좌석안전띠·동승보호자
              ·전원하차), 탑승·하차 이벤트(시각·위치), 위치 ping(운행 중에 한함)
            </>,
            <>
              <strong>자동 수집</strong>: 접속 기기 정보(User Agent), IP, 푸시
              구독 endpoint, 서비스 이용 기록(에러 로그)
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. 위치정보 수집·이용에 관한 별도 고지">
        <p>
          기사 폰의 GPS 위치는 다음 원칙에 따라 처리됩니다(위치정보의 보호
          및 이용 등에 관한 법률 준수).
        </p>
        <LegalList
          items={[
            "수집은 운행 시작~종료 시점 사이에만 이루어집니다.",
            "운행 종료 즉시 기사 폰의 GPS 송신이 중단됩니다.",
            "실시간 broadcast는 5초 간격으로 학부모에게만 전달되며 영구 저장되지 않습니다.",
            "영구 저장은 30초 간격 또는 정류장 통과 시점에 한해 LocationPing 테이블에 기록됩니다.",
            "학부모는 본인 자녀가 탑승한 운행(Trip)의 위치만 조회할 수 있습니다.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. 개인정보의 보유 및 이용 기간">
        <LegalList
          items={[
            "회원 정보: 회원 탈퇴 시까지(다만, 부정 이용 방지·분쟁 처리를 위해 최대 3개월간 보관 가능)",
            "운행 데이터(안전점검·탑승·하차·위치 ping): 분기 종료 후 최소 3년 (도로교통법 §53⑦ 안전운행기록 의무 대응)",
            "결제·세금계산서 정보: 전자상거래법에 따라 5년",
            "푸시 구독 정보: 구독 해제 또는 endpoint 만료 시 즉시 삭제",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. 개인정보의 제3자 제공">
        <p>
          회사는 회원의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
          다만 다음의 경우는 예외로 합니다.
        </p>
        <LegalList
          items={[
            "이용자가 사전에 동의한 경우",
            "법령에 의해 요구되거나 수사기관의 적법한 요청이 있는 경우",
            "동일 기관 내 학원장·기사·동승보호자·학부모 간 운영상 필요한 정보 공유(자녀 탑승·하차, 운행 위치 등)",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. 처리 위탁">
        <p>
          서비스 제공을 위해 다음 업체에 개인정보 처리 업무를 위탁하고
          있습니다.
        </p>
        <LegalList
          items={[
            "Supabase Inc. — 데이터베이스·인증·실시간 broadcast (region: ap-northeast-2 Seoul)",
            "Vercel Inc. — 웹 호스팅·CDN",
            "Kakao Corp. — 카카오맵 SDK (정류장·위치 시각화)",
            "Web Push 서비스 제공자(Mozilla/Google/Apple) — 푸시 알림 전달",
          ]}
        />
        <p className="text-muted-foreground text-xs">
          위탁 업체별 개인정보 처리 정책은 각 업체의 정책을 따릅니다. 위탁
          관계 변경 시 본 방침을 통해 공지합니다.
        </p>
      </LegalSection>

      <LegalSection title="7. 정보주체의 권리·의무 및 행사 방법">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <LegalList
          items={[
            "개인정보 열람 요구",
            "오류 등이 있을 경우 정정 요구",
            "삭제 요구 (도로교통법상 의무 대응 운행 데이터는 보존 기간 경과 후 삭제)",
            "처리 정지 요구",
          ]}
        />
        <p>
          권리 행사는 회사 고객센터(이메일: hello@shuttlee.kr)로 요청하시면
          지체 없이 조치합니다.
        </p>
      </LegalSection>

      <LegalSection title="8. 미성년자 정보 처리">
        <p>
          본 서비스는 만 13세 미만 학생·원아의 정보를 보호자(법정대리인)
          동의 하에 수집·이용합니다. 학부모는 가입 시 자녀 정보 처리에
          명시적으로 동의해야 하며, 동의 철회 시 자녀 정보는 즉시 비활성화
          처리됩니다(다만 도로교통법 의무 대응 운행 데이터는 보존 기간
          경과 후 삭제).
        </p>
      </LegalSection>

      <LegalSection title="9. 개인정보의 안전성 확보 조치">
        <LegalList
          items={[
            "전송 구간 암호화(HTTPS/TLS)",
            "데이터베이스 접근 통제(Supabase RLS — 학원 간 데이터 격리)",
            "서비스 롤 키는 서버 코드에서만 사용, 클라이언트 번들에 포함하지 않음",
            "비밀번호 단방향 해시 저장(Supabase Auth)",
            "자동 백업 및 복구 절차 운영(Supabase)",
            "최소 권한 원칙에 따른 직원 접근 통제",
          ]}
        />
      </LegalSection>

      <LegalSection title="10. 쿠키 및 추적 기술">
        <p>
          회사는 로그인 세션 유지를 위해 필수 쿠키(Supabase Auth 쿠키)만
          사용합니다. 마케팅·광고 목적의 추적 쿠키나 제3자 분석 도구는 사용
          하지 않습니다(베타 기간 기준).
        </p>
      </LegalSection>

      <LegalSection title="11. 개인정보 보호책임자">
        <p>
          회사는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보
          처리와 관련한 정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와
          같이 개인정보 보호책임자를 지정합니다.
        </p>
        <LegalList
          items={[
            "이메일: hello@shuttlee.kr",
            "처리 부서: 셔틀이 운영팀",
          ]}
        />
        <p className="text-muted-foreground text-xs">
          개인정보 침해 신고는 개인정보보호위원회(privacy.go.kr,
          국번없이 182) 또는 한국인터넷진흥원 개인정보침해신고센터
          (privacy.kisa.or.kr, 국번없이 118)에도 가능합니다.
        </p>
      </LegalSection>

      <LegalSection title="12. 처리방침 변경">
        <p>
          본 처리방침은 시행일부터 적용되며, 법령 및 방침에 따른 변경내용의
          추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지
          사항을 통하여 고지합니다.
        </p>
      </LegalSection>

      <p className="text-muted-foreground mt-10 text-xs font-medium">
        본 문서는 베타 기간 임시본입니다. 정식 출시 전 법무 검토를 거쳐
        확정되며, 변경 시 회원에게 별도 통지합니다.
      </p>
    </LegalShell>
  );
}
