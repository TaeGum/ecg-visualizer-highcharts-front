// app/page.tsx
import ClientEcgChart from "@/components/ClientEcgChart";

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <main className="container max-w-6xl p-4 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">ECG 차트 시각화</h1>
      <ClientEcgChart apiUrl={`${apiUrl}?lead=II&start=0&end=10`} />
    </main>
  );
}
