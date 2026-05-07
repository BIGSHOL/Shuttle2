import { PushTestForm } from "./_components/push-test-form";

// W24: 매니저 — 푸시 테스트 발송. 직원(웹 푸시 + 앱 푸시) 또는 학부모(웹 푸시).
// 카테고리는 '공지(ANNOUNCEMENT)'로 고정 — 인앱 알림도 함께 생성됩니다.

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">푸시 테스트</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          단일 사용자에게 ‘공지’ 카테고리로 푸시·인앱 알림을 보냅니다. 베타 운영
          중 푸시 등록 상태 점검·고객 대응에 사용하세요.
        </p>
      </div>

      <section className="bg-card rounded-lg border p-5 shadow-sm">
        <PushTestForm />
      </section>

      <section className="bg-muted/30 rounded-lg border p-4 text-xs">
        <p className="text-foreground font-bold">사용 팁</p>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5">
          <li>
            대상 ID는 <code>/admin/users</code>에서 검색 후 상세 페이지 주소의
            마지막 부분 (사용자 ID, cuid 형식).
          </li>
          <li>
            직원은 웹 푸시(브라우저)와 앱 푸시(기사 앱) 양쪽으로, 학부모는 웹
            푸시로만 보냅니다.
          </li>
          <li>
            결과의 <code>발송 0건</code>이면 푸시 등록이 안 된 상태입니다 —
            사용자에게 앱 알림 권한 허용 안내가 필요합니다.
          </li>
          <li>
            ‘만료 정리’는 더 이상 유효하지 않은 구독 주소를 자동 정리한 건수.
            숫자가 크면 디바이스 교체 또는 권한 회수 가능성이 있습니다.
          </li>
        </ul>
      </section>
    </div>
  );
}
