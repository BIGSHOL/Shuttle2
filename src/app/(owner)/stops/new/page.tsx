import { createStopAction } from "../actions";
import { StopForm } from "../_components/stop-form";

export default function NewStopPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <StopForm
        action={createStopAction}
        title="새 정류장 등록"
        description="이름을 적고 지도에서 정류장 위치를 클릭하세요."
        submitLabel="등록"
      />
    </main>
  );
}
