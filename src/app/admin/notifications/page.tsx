import { PushTestForm } from "./_components/push-test-form";

// W24: 매니저 — 푸시 테스트 발송. STAFF (web push + FCM) 또는 GUARDIAN (web push).
// 카테고리는 ANNOUNCEMENT로 hard-coded — 인앱 알림 미러도 동시에 생성됨.

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">푸시 테스트</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          단일 사용자에게 ANNOUNCEMENT 카테고리로 푸시 + 인앱 알림 발송. 베타
          운영 중 푸시 등록 상태 점검·고객 대응에 사용.
        </p>
      </div>

      <section className="bg-card rounded-lg border p-5 shadow-sm">
        <PushTestForm />
      </section>

      <section className="bg-muted/30 rounded-lg border p-4 text-xs">
        <p className="text-foreground font-bold">📚 사용 팁</p>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5">
          <li>
            대상 ID는 <code>/admin/users</code>에서 검색 후 디테일 페이지 URL의
            마지막 segment (cuid 형식).
          </li>
          <li>
            STAFF는 Web Push(브라우저) + FCM(RN 앱) 양쪽 fan-out. GUARDIAN은 Web
            Push만.
          </li>
          <li>
            발송 결과 <code>sent: 0</code>이면 푸시 등록이 안 됨 — 사용자에게 PWA
            알림 권한 허용 안내.
          </li>
          <li>
            <code>pruned</code>는 만료된 endpoint 정리 건수. 큰 숫자면 디바이스
            교체 또는 권한 회수 가능성.
          </li>
        </ul>
      </section>
    </div>
  );
}
