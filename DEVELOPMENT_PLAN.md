# 개발 플랜 — 마커 추적 데이터 기반 좌우 비대칭 분석 웹 애플리케이션

> **기준 문서**: PRD v0.2  
> **작성일**: 2026-05-24  
> **개발 방식**: 1인 기준 예상 공수 / 레이어별 TDD

---

## 1. 기술 스택 결정

| 카테고리 | 선택 | 근거 |
|---|---|---|
| 번들러 | **Vite** | 빠른 HMR, TypeScript 기본 지원 |
| UI 프레임워크 | **React 18 + TypeScript** | PRD 아키텍처 전제 |
| 스타일링 | **Tailwind CSS v3** | 유틸리티 클래스 기반, 빠른 UI 구성 |
| CSV 파싱 | **PapaParse** | 브라우저 스트리밍 파싱, 헤더 커스텀 지원 |
| 차트 | **Recharts** | React 친화적, 커스텀 렌더러 지원 |
| 상태 관리 | **Zustand** | 경량, 미들웨어 없이 LocalStorage 연동 용이 |
| 단위 테스트 | **Vitest** | Vite와 동일 설정 공유, jsdom 지원 |
| 컴포넌트 테스트 | **React Testing Library** | 행동 기반 테스트 |
| 패키지 매니저 | **pnpm** | 빠른 설치, 엄격한 의존성 관리 |
| 린터/포매터 | **ESLint + Prettier** | 코드 품질 통일 |

---

## 2. 마일스톤 구성

```
M0  프로젝트 초기 설정          (0.5일)
M1  도메인 레이어               (2일)   ← 순수 TS, 테스트 우선
M2  어댑터 — 파서               (2일)   ← 실제 CSV 파일로 검증
M3  유즈케이스                  (1.5일)
M4  인프라 — 스토어              (1일)
M5  UI — 업로드 & 정보 입력     (3일)
M6  UI — 시각화 & 대시보드      (3일)
M7  통합 & QA                  (2일)
────────────────────────────────────
총 예상 공수                    ~15일 (1인 기준)
```

---

## 3. 마일스톤별 상세 태스크

---

### M0 · 프로젝트 초기 설정 (0.5일)

**목표**: 팀원 누구나 `pnpm install && pnpm dev` 로 실행 가능한 상태

| # | 태스크 | 세부 내용 |
|---|---|---|
| 0-1 | Vite 스캐폴딩 | `pnpm create vite . --template react-ts` |
| 0-2 | Tailwind CSS 설정 | `tailwind.config.ts`, `postcss.config.ts` |
| 0-3 | ESLint / Prettier | `@typescript-eslint`, import 정렬 플러그인 |
| 0-4 | Vitest 설정 | `vitest.config.ts`, `jsdom` 환경, coverage 설정 |
| 0-5 | 폴더 구조 생성 | PRD §7의 `domain/`, `usecases/`, `adapters/`, `infrastructure/` |
| 0-6 | 샘플 CSV 픽스처 배치 | `tests/fixtures/path_sample.csv`, `angle_sample.csv` |
| 0-7 | CI 설정 | GitHub Actions: `pnpm test`, `pnpm build` on push |

**완료 기준**: `pnpm dev` 실행 → Vite 기본 화면 노출, `pnpm test` → 0 tests, 0 failures

---

### M1 · 도메인 레이어 (2일)

**목표**: 비즈니스 로직을 외부 의존성 없이 완전히 테스트 가능한 상태  
**원칙**: 파일마다 테스트 먼저 작성 → 구현 (TDD)

#### M1-A · 도메인 모델 정의 (0.5일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 1-1 | `domain/models/SubjectInfo.ts` | `SubjectInfo` 인터페이스 + 유효성 검사 함수 (`subjectId` 필수) |
| 1-2 | `domain/models/TestInfo.ts` | `FileType`, `Side` enum, `TestInfo` 인터페이스 |
| 1-3 | `domain/models/MarkerSession.ts` | `PathFrame`, `AngleFrame`, `CsvMetadata`, `MarkerSession` 인터페이스 |
| 1-4 | `domain/models/MappingConfig.ts` | `MappingConfig` 인터페이스 |

#### M1-B · 보간 알고리즘 (0.25일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 1-5 | `domain/metrics/Interpolation.ts` | `linearInterpolate(frames, field)` — 결측(NaN/null) 구간 선형 보간 |
| | `tests/domain/Interpolation.test.ts` | 케이스: 단일 결측, 연속 결측(≤3), 연속 결측(>3 → 경고 반환) |

#### M1-C · PATH 지표 산출 (0.5일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 1-6 | `domain/metrics/PathMetrics.ts` | `calcTotalDistance(frames)` — 프레임 간 유클리드 거리 합산 |
| | | `calcSpeedProfile(frames)` — 프레임별 순간 속도 배열 반환 |
| | | `calcLinearityIndex(frames)` — 시작-끝 직선 거리 / 총 이동 거리 |
| | `tests/domain/PathMetrics.test.ts` | 직선 이동(linearity=1.0), 원형 이동(linearity<1.0), 단일 프레임 엣지케이스 |

#### M1-D · ANGLE 지표 산출 (0.5일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 1-7 | `domain/metrics/AngleMetrics.ts` | `calcAngleDeg(pivotX, pivotY, endX, endY)` — atan2 기반 각도 계산 |
| | | `calcROM(frames)` — max/min angleDeg, ROM(범위) 반환 |
| | | `calcAngularVelocity(frames)` — 프레임별 각속도 배열 |
| | | `calcSegmentLengthStability(frames)` — Pivot-End 거리 SD |
| | `tests/domain/AngleMetrics.test.ts` | 수직(90°), 수평(0°), ROM 계산, 각속도 부호 검증 |

#### M1-E · 비대칭 지표 산출 (0.25일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 1-8 | `domain/metrics/AsymmetryMetrics.ts` | `calcAsymmetryIndex(left, right)` — `AI = |L-R| / ((L+R)/2) × 100` |
| | | `calcFrameAsymmetry(leftFrames, rightFrames)` — 프레임별 거리 차이 시계열 |
| | `tests/domain/AsymmetryMetrics.test.ts` | AI=0(완전 대칭), AI=100(한쪽 0), 경계값 임계 테스트 |

**M1 완료 기준**: `pnpm test domain/` → 전체 통과, 외부 import 없음

---

### M2 · 어댑터 — 파서 (2일)

**목표**: 실제 CSV 파일(픽스처)을 입력으로 도메인 모델을 정확히 반환

#### M2-A · 메타데이터 추출기 (0.5일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 2-1 | `adapters/parsers/MetadataExtractor.ts` | `extractMetadata(rawLines: string[])` — `#` 행을 파싱해 `CsvMetadata` 반환 |
| | | `#Distance,13.56cm` → `{ distance: 13.56 }` 숫자 파싱 포함 |
| | | `#Angle,84.7°` → `{ angle: 84.7 }` 단위 문자(°, cm) 제거 처리 |
| | `tests/adapters/MetadataExtractor.test.ts` | path 픽스처, angle 픽스처, 알 수 없는 키(raw에 보존) |

#### M2-B · PATH CSV 파서 (0.75일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 2-2 | `adapters/parsers/PathCsvParser.ts` | `parsePathCsv(rawText: string)` → `{ metadata, frames: PathFrame[] }` |
| | | `#` 행 건너뛰기 → 빈 행 건너뛰기 → 첫 비-# 비-빈 행을 헤더로 확정 |
| | | `time` 컬럼(`HH:MM:SS.mmm`) → `timeMs` (ms 정수) 변환 |
| | | `TotalPoints` 대비 실제 행 수 불일치 시 `warning` 필드 포함 반환 |
| | `tests/adapters/PathCsvParser.test.ts` | 정상 픽스처, 결측 행 포함, TotalPoints 불일치, 시간 파싱 정밀도 |

#### M2-C · ANGLE CSV 파서 (0.75일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 2-3 | `adapters/parsers/AngleCsvParser.ts` | `parseAngleCsv(rawText: string)` → `{ metadata, frames: AngleFrame[] }` |
| | | 2단 헤더 처리: 그룹 헤더 행(`,,Ball(Pivot),,Ball(End),`) 무시 |
| | | 중복 컬럼 재명명: `x_cm[0]`→`pivotX`, `y_cm[0]`→`pivotY`, `x_cm[1]`→`endX`, `y_cm[1]`→`endY` |
| | | `angleDeg` 필드를 `AngleMetrics.calcAngleDeg()`로 자동 계산하여 프레임에 포함 |
| | | Pivot 마커 원점 정규화: 첫 프레임의 `pivotX`, `pivotY`를 오프셋으로 차감 |
| | `tests/adapters/AngleCsvParser.test.ts` | 정상 픽스처, 그룹 헤더 감지, 각도 계산 검증, 정규화 후 첫 프레임 pivot=(0,0) |

**M2 완료 기준**: 실제 업로드 CSV 파일 두 종류 모두 파싱 성공, 도메인 모델 필드 전부 채워짐

---

### M3 · 유즈케이스 (1.5일)

**목표**: 도메인 + 파서를 연결하는 애플리케이션 로직 완성

| # | 파일 | 작업 내용 |
|---|---|---|
| 3-1 | `usecases/RegisterSession.ts` | `registerSession(file, subject, testInfo)` — 파일 타입 분기 후 파서 호출, `MarkerSession` 생성 및 UUID 부여 |
| 3-2 | `usecases/PairSessions.ts` | `findPair(sessions, session)` — 동일 `subjectId+testId+fileType`에서 반대 `side` 세션 탐색, `pairedSessionId` 업데이트 |
| 3-3 | `usecases/AnalyzeSingle.ts` | `analyzeSingle(session)` — 타입별 지표 산출 후 `SingleAnalysisResult` 반환 |
| 3-4 | `usecases/AnalyzeAsymmetry.ts` | `analyzeAsymmetry(leftSession, rightSession)` — AI 및 프레임별 비대칭 시계열 반환 |
| 3-5 | `usecases/ManageMapping.ts` | `saveMapping(config)` / `loadMapping(fileType)` — LocalStorage CRUD |

**테스트**: 각 유즈케이스별 단위 테스트, 파서는 목(Mock) 주입

**M3 완료 기준**: `pnpm test usecases/` 전체 통과

---

### M4 · 인프라 — 스토어 (1일)

**목표**: UI 상태를 중앙에서 관리하고 LocalStorage와 동기화

| # | 파일 | 작업 내용 |
|---|---|---|
| 4-1 | `infrastructure/store/SessionStore.ts` | Zustand 스토어: `sessions[]`, `addSession()`, `removeSession()`, `selectSession()` |
| | | `usecases/PairSessions`를 `addSession` 내부에서 자동 호출 |
| 4-2 | `infrastructure/store/SubjectStore.ts` | Zustand + LocalStorage 미들웨어: 대상자 목록 영속화 |
| | | `getSubject(id)`, `upsertSubject(subject)` |
| 4-3 | `infrastructure/parsers/PapaParseWrapper.ts` | `parseFile(file: File)` → raw 텍스트 반환 (PapaParse 래핑) |

**M4 완료 기준**: 스토어 단위 테스트 통과, LocalStorage 저장/복원 동작 확인

---

### M5 · UI — 업로드 & 정보 입력 (3일)

**목표**: 사용자가 파일을 올리고 대상자/검사 정보를 입력하는 전체 플로우 완성

#### M5-A · FileUploader 컴포넌트 (1일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 5-1 | `infrastructure/components/FileUploader.tsx` | 드래그&드롭 영역, 파일 선택 버튼 |
| | | 파일 선택 즉시 파일명에서 `FileType` 자동 추론 및 표시 |
| | | 파일 타입 수동 변경 드롭다운 |
| | | 파싱 실패 시 "헤더 행 번호 직접 지정" 폴백 UI |

#### M5-B · SubjectForm 컴포넌트 (0.75일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 5-2 | `infrastructure/components/SubjectForm.tsx` | `subjectId` 입력 → 기존 대상자 자동 로드 |
| | | 이름, 나이, 성별, 키(cm), 몸무게(kg), 비고 필드 |
| | | 입력값 유효성 검사 (subjectId 필수, 숫자 필드 범위) |

#### M5-C · TestInfoForm 컴포넌트 (0.75일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 5-3 | `infrastructure/components/TestInfoForm.tsx` | `testId` 입력, 좌/우 토글 버튼 (L / R) |
| | | 측정 일시 — CSV 메타데이터에서 자동 추출 후 `<input type="datetime-local">` 표시 |
| | | 파일 타입 확인 표시 (자동 추론 결과, 수정 가능) |

#### M5-D · 업로드 통합 플로우 (0.5일)

| # | 작업 내용 |
|---|---|
| 5-4 | FileUploader → SubjectForm → TestInfoForm 의 단계형 모달/사이드패널 구성 |
| 5-5 | "등록" 버튼 클릭 시 `RegisterSession` 유즈케이스 실행 → SessionStore에 추가 |
| 5-6 | 등록 성공 시 즉시 단독 분석 뷰로 이동 |

**M5 완료 기준**: 실제 CSV 파일 업로드 → 대상자/검사 정보 입력 → 세션 등록까지 오류 없이 완료

---

### M6 · UI — 시각화 & 대시보드 (3일)

**목표**: 등록된 세션을 즉시 시각화하고, 쌍 완성 시 비대칭 분석 표시

#### M6-A · SessionList 컴포넌트 (0.5일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 6-1 | `infrastructure/components/SessionList.tsx` | 대상자 기준 그룹화 목록 |
| | | 단독 세션: 🟡 노란 배지, "반대측 파일 추가" 안내 버튼 |
| | | 쌍 세션: 🟢 초록 배지, "비대칭 분석 보기" 버튼 |
| | | 세션 삭제, 세션 선택 |

#### M6-B · TrajectoryChart 컴포넌트 (1일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 6-2 | `infrastructure/components/TrajectoryChart.tsx` | Recharts `ScatterChart` 기반 2D 궤적 |
| | | PATH: 단일 마커 궤적 (파란색 선) |
| | | ANGLE: Pivot(●) + End(○) 두 마커 및 분절 연결선 |
| | | 쌍 오버레이: 좌(파랑)·우(빨강) 동시 표시 |
| | | 줌/팬 지원 (`recharts-zoom`) |
| 6-3 | `adapters/presenters/TrajectoryPresenter.ts` | `MarkerSession → ScatterChart` 데이터 포맷 변환 |

#### M6-C · SpeedProfile & AngleProfile 차트 (0.5일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 6-4 | 속도/각속도 시계열 | Recharts `LineChart`, X축=시간(ms), Y축=속도 or 각속도 |
| | | PATH: 속도 프로파일 |
| | | ANGLE: 각속도 프로파일 |

#### M6-D · Asymmetry Dashboard (0.5일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 6-5 | `infrastructure/components/AsymmetryDashboard.tsx` | Asymmetry Timeline (프레임별 AI 시계열 라인차트) |
| | | 경계값(기본 10%) 초과 구간 배경색 하이라이트 (`ReferenceLine`) |
| | | 경계값 슬라이더 (사용자 설정) |
| 6-6 | `adapters/presenters/AsymmetryPresenter.ts` | 비대칭 분석 결과 → LineChart 데이터 포맷 변환 |

#### M6-E · Summary Cards (0.5일)

| # | 파일 | 작업 내용 |
|---|---|---|
| 6-7 | 단독 Summary Card | 총 거리 / ROM / 측정 시간 / 직선성 지수 |
| | | CSV 메타데이터 값(`#Distance`, `#Angle`) 대조 표시 |
| 6-8 | 비교 Summary Card | 좌/우 지표 나란히, AI 값 강조 표시 |
| | | 정상 범위(10%) 이내: 초록, 초과: 빨강 |

**M6 완료 기준**: 실제 데이터로 궤적·속도·비대칭 차트 렌더링 확인, 쌍 구성 시 오버레이 정상 동작

---

### M7 · 통합 & QA (2일)

**목표**: 전 레이어 연결, 성능 검증, 엣지케이스 처리

| # | 작업 내용 |
|---|---|
| 7-1 | 전체 E2E 플로우 수동 테스트 — 실제 파일 2종(path_, angle_) 좌우 각 1개씩 업로드 |
| 7-2 | 성능 검증 — 10,000행 CSV 파싱 500ms 이하 확인 (`performance.now()` 측정) |
| 7-3 | 엣지케이스 처리 — 결측 행 포함 파일, TotalPoints 불일치 파일, 미인식 파일명 |
| 7-4 | 반응형 레이아웃 — 모바일(375px), 태블릿(768px), 데스크탑(1280px) 확인 |
| 7-5 | 크로스 브라우저 — Chrome, Firefox, Safari 동작 확인 |
| 7-6 | LocalStorage 영속화 검증 — 새로고침 후 대상자 정보 유지 확인 |
| 7-7 | 접근성 — 주요 컨트롤 키보드 조작 가능 여부 확인 |
| 7-8 | 빌드 최적화 — `pnpm build` → 번들 크기 500KB 이하(gzip) 목표 |

---

## 4. 의존성 그래프

```
M0 (설정)
  └─► M1 (도메인)
        └─► M2 (파서)        M1과 M2는 병렬 가능 (M2는 M1 인터페이스만 참조)
              └─► M3 (유즈케이스)
                    └─► M4 (스토어)
                          ├─► M5 (업로드 UI)    M5와 M6-A는 병렬 가능
                          └─► M6 (시각화 UI)
                                └─► M7 (QA)
```

**병렬화 가능 구간**

- M1-C (PathMetrics)와 M1-D (AngleMetrics)는 독립 → 동시 작업 가능
- M5와 M6-A (SessionList)는 스토어 인터페이스 확정 후 독립 진행 가능
- M2-B (PathParser)와 M2-C (AngleParser)는 독립 → 동시 작업 가능

---

## 5. 테스트 전략

| 레이어 | 도구 | 커버리지 목표 | 비고 |
|---|---|---|---|
| `domain/` | Vitest | **100%** | 외부 의존 없음, 완전 TDD |
| `adapters/parsers/` | Vitest + 픽스처 CSV | **90%+** | 실제 파일 기반 |
| `usecases/` | Vitest + Mock | **90%+** | 파서를 Mock으로 주입 |
| `infrastructure/store/` | Vitest + jsdom | **80%+** | LocalStorage 포함 |
| UI 컴포넌트 | React Testing Library | **핵심 플로우** | 업로드 → 등록 → 시각화 |

---

## 6. 폴더/파일 생성 순서 체크리스트

```
□ M0  pnpm create vite, Tailwind, Vitest, ESLint 설정
□ M0  tests/fixtures/ 샘플 CSV 배치

□ M1  domain/models/ 4개 파일
□ M1  domain/metrics/Interpolation.ts + 테스트
□ M1  domain/metrics/PathMetrics.ts + 테스트
□ M1  domain/metrics/AngleMetrics.ts + 테스트
□ M1  domain/metrics/AsymmetryMetrics.ts + 테스트

□ M2  adapters/parsers/MetadataExtractor.ts + 테스트
□ M2  adapters/parsers/PathCsvParser.ts + 테스트
□ M2  adapters/parsers/AngleCsvParser.ts + 테스트

□ M3  usecases/RegisterSession.ts + 테스트
□ M3  usecases/PairSessions.ts + 테스트
□ M3  usecases/AnalyzeSingle.ts + 테스트
□ M3  usecases/AnalyzeAsymmetry.ts + 테스트
□ M3  usecases/ManageMapping.ts + 테스트

□ M4  infrastructure/parsers/PapaParseWrapper.ts
□ M4  infrastructure/store/SessionStore.ts + 테스트
□ M4  infrastructure/store/SubjectStore.ts + 테스트

□ M5  infrastructure/components/FileUploader.tsx
□ M5  infrastructure/components/SubjectForm.tsx
□ M5  infrastructure/components/TestInfoForm.tsx
□ M5  업로드 통합 플로우 연결

□ M6  infrastructure/components/SessionList.tsx
□ M6  adapters/presenters/TrajectoryPresenter.ts
□ M6  infrastructure/components/TrajectoryChart.tsx
□ M6  Speed/Angle Profile 차트
□ M6  adapters/presenters/AsymmetryPresenter.ts
□ M6  infrastructure/components/AsymmetryDashboard.tsx
□ M6  Summary Cards

□ M7  전체 통합 테스트 및 QA
```

---

## 7. 리스크 및 대응

| 리스크 | 가능성 | 대응 |
|---|---|---|
| CSV 포맷이 샘플과 다른 변형 존재 | 중 | `MetadataExtractor`의 `raw` 필드로 미인식 키 보존, 수동 오버라이드 UI 확보 |
| Recharts 성능 — 10,000행 렌더링 | 중 | 포인트 다운샘플링(데이터 간격 줄이기) 옵션 또는 Canvas 기반 차트(`react-chartjs-2`) 전환 |
| 쌍 구성 조건 모호 (같은 testId 없이 업로드) | 중 | 쌍 수동 연결 UI 추가 (SessionList에서 드래그 또는 선택 매핑) |
| LocalStorage 용량 초과 (대상자 다수) | 저 | 대상자 정보만 저장 (프레임 데이터 제외), 필요 시 IndexedDB 전환 |
| `angle_` 2단 헤더 외 새 변형 포맷 | 저 | 파서 팩토리 패턴으로 타입 추가 확장성 확보 |
```
