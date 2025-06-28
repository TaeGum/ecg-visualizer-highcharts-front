import { useQuery } from "@tanstack/react-query";

export const fetchEcgData = async (apiUrl: string) => {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("ECG 데이터를 불러오는데 실패했습니다");
    return await response.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // 에러 발생 시 더미 데이터 반환
    return {
      data: Array.from({ length: 2500 }, (_, i) => ({
        amplitude: Math.sin(i / 100) * 1.2 + Math.random() * 0.2,
      })),
    };
  }
};

export const useEcgData = (apiUrl: string) => {
  return useQuery({
    queryKey: ["ecgData", apiUrl],
    queryFn: () => fetchEcgData(apiUrl),
    staleTime: 300000, // 5분
    refetchOnWindowFocus: false,
  });
};
