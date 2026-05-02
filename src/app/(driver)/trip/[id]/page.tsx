import { TripScreen } from "./trip-screen";

export default async function DriverTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripScreen tripId={id} />;
}
