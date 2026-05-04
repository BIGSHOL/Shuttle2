import { createVehicleAction } from "../actions";
import { VehicleForm } from "../_components/vehicle-form";

export default function NewVehiclePage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <VehicleForm
        action={createVehicleAction}
        title="새 차량 등록"
        description="차량번호와 운영 모드를 선택하세요. 어린이용 모드는 신고증명서가 필요합니다."
        submitLabel="등록"
      />
    </main>
  );
}
