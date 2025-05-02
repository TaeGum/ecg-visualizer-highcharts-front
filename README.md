# ecg-visualizer-highcharts-front

ECG(심전도) 데이터 시각화 및 어노테이션을 위한 프론트엔드 프로젝트입니다.  
Next.js, Tailwind CSS, Highcharts, React Query, Recoil을 기반으로 빠른 개발과 확장성을 목표로 합니다.

---

## 기술 스택

- **Next.js** (React 기반 프레임워크)
- **Tailwind CSS** (유틸리티 퍼스트 CSS 프레임워크)
- **Highcharts** (고성능 차트 라이브러리)
- **React Query** (@tanstack/react-query, 서버 상태 관리 및 데이터 패칭)
- **Recoil** (글로벌 상태 관리)

---

## 초기 세팅 방법

### 1. 프로젝트 생성

```
npx create-next-app@latest ecg-visualizer-highcharts-front
설치 중 Tailwind CSS, TypeScript 등 옵션을 Yes로 선택
cd ecg-visualizer-highcharts-front
```


### 2. 필수 패키지 설치

```
npm install highcharts highcharts-react-official @tanstack/react-query recoil
```


---

## 프로젝트 구조 예시

```
ecg-visualizer-highcharts-front/
├── app/ # (또는 pages/) Next.js 라우트
├── components/ # 재사용 컴포넌트
│ └── EcgChart.tsx # Highcharts 차트 컴포넌트 예시
├── atoms/ # Recoil 상태(atom) 정의
│ └── annotationAtom.ts
├── styles/
│ └── globals.css # TailwindCSS import
├── README.md
└── ...
```

---

## 실행 방법

- 기본 주소: [http://localhost:3000](http://localhost:3000)

---

## 참고

- 백엔드 API 서버가 실행 중이어야 ECG 데이터가 정상적으로 표시됩니다.
- 필요에 따라 어노테이션 저장, 사용자 인증 등 추가 기능을 확장할 수 있습니다.

---

## License

MIT

