import { CalendarView } from "@/components/CalendarView";
import { getUserPlans } from "@/lib/db";

export default async function CalendarPage() {
  const plans = await getUserPlans();
  return <CalendarView plans={plans} />;
}
