# [PRD] 마커 추적 데이터 기반 좌우 비대칭 분석 웹 애플리케이션

> **문서 버전**: v0.2  
> **최종 수정**: 2026-05-24  
> **변경 이력**: v0.1 초안 → v0.2 파일 구조 실측 기반 전면 개정 (파일 타입 분류, 단건 업로드 UX, 대상자·검사 정보 입력 추가)

---

## 1. 프로젝트 개요 (Project Overview)

본 프로젝트는 모션 캡처 장비에서 내보낸 CSV 포맷의 마커 시계열 데이터를 업로드하여, 웹 브라우저 상에서 마커의 이동 궤적(Trajectory)을 시각화하고, 동일 대상자의 좌·우측 측정값을 대응시켜 비대칭성(Asymmetry)을 분석하는 바이오메카닉스 툴킷 개발을 목표로 합니다.

- **배경**: 상용 장비의 원시 데이터(CSV)는 환자나 임상가가 직관적으로 이해하기 어렵고, 분석 시마다 별도의 스크립트(MATLAB, Python 등)가 필요합니다.
- **목적**: 브라우저 단에서 구동되는 가볍고 직관적인 웹 앱을 통해, 데이터 업로드·대상자 정보 등록과 동시에 궤적 시각화 및 비대칭 지수 리포트를 즉각 제공합니다.

---

## 2. 핵심 가치 및 타겟 유저

- **주요 사용자**: 물리치료사, 임상 동작 분석 연구원, 운동 처방사 및 재활 의학 관계자
- **핵심 가치**
  - **호환성**: `path_*` / `angle_*` 두 파일 타입과 각각의 상이한 헤더 구조를 타입별로 분기하여 안정적으로 처리합니다.
  - **신속성 및 보안**: 서버로 데이터를 전송하지 않고 100% 브라우저 메모리 내에서 연산하여 개인정보 노출 위험이 없습니다.
  - **직관성**: 복잡한 시계열 좌표 데이터를 2D 궤적 그래프·비대칭 대시보드로 전환합니다.
  - **유연성**: 파일을 한 번에 한 개씩 업로드해도 즉시 단독 분석이 가능하며, 동일 대상자의 반대측 파일이 등록되는 순간 자동으로 쌍(Pair) 비대칭 분석으로 전환됩니다.

---

## 3. 파일 타입 명세 (File Type Specification)

장비에서 출력되는 CSV 파일은 파일명 접두사에 따라 두 가지 타입으로 구분됩니다.

### 3.1 공통 구조

모든 파일은 상단에 `#`으로 시작하는 메타데이터 블록을 가집니다.

```
#<측정명> — <날짜시각>
#<키>,<값>
...
                    ← 빈 행
<헤더 행>           ← 첫 번째 비-# 비-빈 행
<데이터 행들>
```

**파서 규칙**: `#`으로 시작하거나 빈 행은 메타데이터로 처리하고, 첫 번째 비-`#` 비-빈 행을 헤더 행으로 확정합니다. 밀도 기반 탐지 방식(v0.1)은 사용하지 않습니다.

### 3.2 FileType.PATH (`path_*.csv`)

단일 마커의 3초 내외 이동 궤적을 기록합니다.

| 메타데이터 키 | 예시 값 | 활용 |
|---|---|---|
| `#Distance` | `13.56cm` | Summary Card 표시 |
| `#StartCoord` / `#EndCoord` | `0.0000,0.0000` / `3.3976,10.6349` | 궤적 검증 |
| `#TotalPoints` | `95` | 파싱 완료 후 행 수 검증 |

**컬럼 구조** (헤더 1행)

```
index, time, x_cm, y_cm
```

- 데이터는 장비 자체적으로 시작점 `(0, 0)` 기준으로 기록되므로, 원점 정규화를 추가 적용하지 않습니다.

### 3.3 FileType.ANGLE (`angle_*.csv`)

Pivot 마커(관절 중심)와 End 마커(분절 말단) 두 마커 사이의 관절각 측정값을 기록합니다.

| 메타데이터 키 | 예시 값 | 활용 |
|---|---|---|
| `#Angle` | `84.7°` | 정상 ROM 비교 기준값 |
| `#Length` | `21.5cm` | 분절 길이 표시 |
| `#TotalPoints` | `164` | 파싱 완료 후 행 수 검증 |

**컬럼 구조** (헤더 2행 구조)

```
,,Ball(Pivot),,Ball(End),     ← 그룹 헤더 행 (파싱 시 무시 후 컬럼명 재부여)
index,time,x_cm,y_cm,x_cm,y_cm
```

`x_cm`, `y_cm`이 중복되므로 파서가 내부적으로 `pivot_x`, `pivot_y`, `end_x`, `end_y`로 재명명합니다.

- Pivot 마커는 관절 고정점이므로 시작 위치를 원점으로 정규화합니다.

---

## 4. 기능적 요구사항 (Functional Requirements)

### 4.1 파일 업로드 및 정보 등록 플로우

파일은 **한 번에 한 개씩** 업로드할 수 있습니다. 업로드 시 아래 정보를 함께 입력합니다.

#### 4.1.1 대상자 정보 (Subject Information)

| 항목 | 필드명 | 타입 | 필수 여부 |
|---|---|---|---|
| 대상자 ID | `subjectId` | string | 필수 |
| 이름 (이니셜 권장) | `name` | string | 선택 |
| 생년월일 또는 나이 | `age` | number (세) | 선택 |
| 성별 | `sex` | `'M' \| 'F' \| 'OTHER'` | 선택 |
| 키 | `heightCm` | number | 선택 |
| 몸무게 | `weightKg` | number | 선택 |
| 비고 | `note` | string | 선택 |

- 동일 `subjectId`를 입력하면 기존 대상자 정보를 자동 불러오고 수정 가능합니다.
- 대상자 정보는 `LocalStorage`에 저장되어 재방문 시 재사용됩니다.

#### 4.1.2 검사 정보 (Test Information)

| 항목 | 필드명 | 타입 | 필수 여부 |
|---|---|---|---|
| 검사 ID | `testId` | string | 필수 |
| 검사 측 | `side` | `'LEFT' \| 'RIGHT'` | 필수 |
| 검사 일시 | `measuredAt` | datetime (파일 메타에서 자동 추출, 수정 가능) | 필수 |
| 파일 타입 | `fileType` | `'PATH' \| 'ANGLE'` (파일명에서 자동 추론, 수정 가능) | 필수 |
| 비고 | `note` | string | 선택 |

**파일 타입 자동 추론 규칙**

- 파일명이 `path_`로 시작 → `FileType.PATH`
- 파일명이 `angle_`로 시작 → `FileType.ANGLE`
- 해당 없으면 사용자가 직접 선택

#### 4.1.3 업로드 후 즉시 단독 분석

- 파일이 한 개만 등록된 상태(짝 없음)에서도 즉시 단독 궤적 시각화 및 단독 지표를 표시합니다.
- 동일 `subjectId` + `testId` + `fileType` 조합에서 반대 `side`의 파일이 등록되면, 자동으로 쌍(Pair)이 구성되어 비대칭 분석 패널이 활성화됩니다.

### 4.2 세션 관리 (Session Management)

- 업로드된 파일 목록을 대상자 기준으로 그룹화하여 표시합니다.
- 각 항목의 페어링 상태를 시각적으로 구분합니다.

| 상태 | 표시 | 활성 기능 |
|---|---|---|
| 단독 (좌 또는 우만 있음) | 🟡 노란 배지 | 단독 궤적 시각화 |
| 쌍 완성 (좌 + 우) | 🟢 초록 배지 | 단독 + 비대칭 분석 |

### 4.3 CSV 파싱 및 데이터 무결성 (Parsing & Fault Tolerance)

- **메타데이터 추출**: `#`으로 시작하는 행을 파싱하여 `key: value` 형태로 도메인 모델에 포함합니다.
- **결측치 처리**: `NaN` 또는 빈 좌표 값이 있는 행은 전후 프레임 기반 선형 보간(Linear Interpolation)을 적용합니다. 연속 3프레임 이상 결측 시 경고를 표시합니다.
- **행 수 검증**: 파싱 완료 후 실제 행 수가 `#TotalPoints` 값과 일치하는지 검증하고, 불일치 시 경고 배너를 표시합니다.
- **수동 오버라이드**: 자동 파싱이 실패한 경우, 사용자가 직접 헤더 행 번호를 지정할 수 있는 UI를 제공합니다.

### 4.4 분석 지표 산출 (Metrics)

#### PATH 타입 지표

- 총 이동 거리 (장비 메타데이터의 `#Distance` 활용)
- 이동 속도 프로파일 (프레임 간 거리 / 시간 간격)
- 궤적의 직선성 지수 (시작-끝 직선 거리 / 총 이동 거리)

#### ANGLE 타입 지표

- 최대 관절각, 최소 관절각, 가동범위(ROM) — `#Angle` 메타데이터 대조
- 각속도 프로파일
- Pivot-End 분절 길이의 안정성 (측정 중 길이 변동 SD)

#### 비대칭 지수 (쌍이 구성된 경우)

- 프레임별 좌우 이동 거리 차이
- ROM 비대칭 지수 (AI): `AI = |L - R| / ((L + R) / 2) × 100 (%)`
- 최대 비대칭도, 평균 비대칭도
- 임상적 경계값(기본값 10%, 사용자 설정 가능) 초과 구간 하이라이트

> 세부 산출 공식은 `domain/metrics/` 내에서 관리하며 향후 업데이트가 가능하도록 분리 설계합니다.

### 4.5 시각화 및 대시보드 (Visualization)

#### 단독 분석 뷰 (파일 1개)

- **Trajectory Plot**: 마커 이동 궤적을 2D 평면에 표시
- **Speed Profile Chart**: 시간 흐름에 따른 속도 변화
- **Summary Card**: 총 거리, ROM, 측정 시간 등 주요 지표

#### 쌍 비대칭 분석 뷰 (파일 2개)

- **Overlay Trajectory Plot**: 좌측(파란 계열)·우측(빨간 계열) 궤적을 동일 평면에 오버레이
- **Asymmetry Timeline**: 시간 흐름에 따른 비대칭도 변화, 경계값 초과 구간 하이라이트
- **Comparison Summary Card**: 좌우 지표 나란히 표시, AI 값, 정상 범위 충족 여부

---

## 5. 비기능적 요구사항 (Non-Functional Requirements)

| 항목 | 요구 사항 |
|---|---|
| 파싱 성능 | 최대 10,000행 파일 기준 파싱·변환 500ms 이하 |
| 렌더링 | 차트 렌더링 시 프레임 드롭 없음 |
| 보안 | 100% 클라이언트사이드 처리, 서버 데이터 전송 없음 |
| 저장 | 대상자 정보, 헤더 매핑 설정은 LocalStorage에 저장 (파일 원본 데이터는 저장하지 않음) |
| 브라우저 지원 | Chrome/Edge/Firefox/Safari 최신 2버전 |

---

## 6. 도메인 모델 (Domain Models)

```typescript
// 대상자 정보
interface SubjectInfo {
  subjectId: string;
  name?: string;
  age?: number;
  sex?: 'M' | 'F' | 'OTHER';
  heightCm?: number;
  weightKg?: number;
  note?: string;
}

// 검사 정보
type FileType = 'PATH' | 'ANGLE';
type Side = 'LEFT' | 'RIGHT';

interface TestInfo {
  testId: string;
  side: Side;
  fileType: FileType;
  measuredAt: Date;
  note?: string;
}

// 파일 메타데이터 (# 행에서 추출)
interface CsvMetadata {
  distance?: number;       // PATH 전용 (cm)
  angle?: number;          // ANGLE 전용 (degree)
  length?: number;         // ANGLE 전용 (cm)
  totalPoints?: number;
  startCoord?: [number, number];
  endCoord?: [number, number];
  startTime?: string;
  endTime?: string;
  raw: Record<string, string>; // 기타 메타데이터
}

// PATH 타입 프레임
interface PathFrame {
  index: number;
  timeMs: number;  // 절대 시각을 ms로 변환
  x: number;
  y: number;
}

// ANGLE 타입 프레임
interface AngleFrame {
  index: number;
  timeMs: number;
  pivotX: number;
  pivotY: number;
  endX: number;
  endY: number;
  angleDeg: number; // 계산값
}

// 마커 세션 — 업로드 1건의 완전한 표현
interface MarkerSession {
  id: string;           // UUID, 앱 내부 식별자
  subject: SubjectInfo;
  test: TestInfo;
  metadata: CsvMetadata;
  frames: PathFrame[] | AngleFrame[];
  pairedSessionId?: string; // 반대 side 세션 ID
}

// 헤더 매핑 설정 (LocalStorage 저장 대상)
interface MappingConfig {
  fileType: FileType;
  headerRowIndex: number;
  columnMap: Record<string, string>;
}
```

---

## 7. 아키텍처 설계 (Clean Architecture)

비즈니스 로직이 UI 프레임워크(React)나 외부 라이브러리(PapaParse, 차트 라이브러리)에 종속되지 않도록 레이어를 엄격히 분리합니다.

```
src/
├── domain/
│   ├── models/
│   │   ├── SubjectInfo.ts
│   │   ├── TestInfo.ts          # FileType, Side enum 포함
│   │   ├── MarkerSession.ts
│   │   └── MappingConfig.ts
│   └── metrics/
│       ├── PathMetrics.ts       # 거리, 속도, 직선성 산출
│       ├── AngleMetrics.ts      # ROM, 각속도 산출
│       ├── AsymmetryMetrics.ts  # AI 산출 (쌍 세션 입력)
│       └── Interpolation.ts    # 선형 보간
│
├── usecases/
│   ├── RegisterSession.ts       # 파일 + 대상자/검사 정보를 받아 MarkerSession 생성
│   ├── PairSessions.ts          # 동일 subject+test+fileType의 L/R 세션을 자동 연결
│   ├── AnalyzeSingle.ts         # 단독 세션 지표 산출
│   ├── AnalyzeAsymmetry.ts      # 쌍 세션 비대칭 지표 산출
│   └── ManageMapping.ts         # 매핑 설정 LocalStorage 저장/불러오기
│
├── adapters/
│   ├── parsers/
│   │   ├── MetadataExtractor.ts # # 행 → CsvMetadata 변환
│   │   ├── PathCsvParser.ts     # PATH 타입 CSV → PathFrame[]
│   │   └── AngleCsvParser.ts    # ANGLE 타입 CSV → AngleFrame[] (2단 헤더 처리)
│   └── presenters/
│       ├── TrajectoryPresenter.ts   # 도메인 결과 → 차트 라이브러리 포맷
│       └── AsymmetryPresenter.ts
│
└── infrastructure/
    ├── components/
    │   ├── FileUploader.tsx         # 파일 드래그&드롭 + 정보 입력 폼
    │   ├── SubjectForm.tsx          # 대상자 정보 입력/선택
    │   ├── TestInfoForm.tsx         # 검사 정보 입력 (side, testId 등)
    │   ├── SessionList.tsx          # 업로드된 세션 목록 (페어링 상태 배지 포함)
    │   ├── TrajectoryChart.tsx
    │   └── AsymmetryDashboard.tsx
    ├── parsers/
    │   └── PapaParseWrapper.ts      # PapaParse 래퍼
    └── store/
        └── SessionStore.ts          # Zustand 또는 Context API 기반 세션 상태 관리
```

**Clean Architecture 핵심 원칙**

- `domain/`과 `usecases/`는 순수 TypeScript로만 작성하며, React·PapaParse 등 외부 모듈을 `import`하지 않습니다.
- 이를 통해 브라우저 없이도 완전한 단위 테스트(Unit Test / TDD)가 가능합니다.
- 파일 타입별 분기(`PATH` / `ANGLE`)는 `adapters/parsers/` 레이어에서만 발생하고, `domain/`은 타입에 무관한 공통 인터페이스를 사용합니다.

---

## 8. 주요 UX 플로우

```
[파일 선택 / 드래그&드롭]
        ↓
[파일명에서 FileType 자동 추론] → 사용자 확인/수정
        ↓
[대상자 ID 입력] → 기존 대상자이면 정보 자동 로드
        ↓
[대상자 정보 입력/확인] (height, weight, age, sex …)
        ↓
[검사 정보 입력] (testId, side: L/R, 측정일시)
        ↓
[CSV 파싱 + 메타데이터 추출]
        ↓
[단독 궤적 시각화 + 단독 지표 표시]
        ↓
동일 subject + testId + fileType 에 반대 side 존재?
 ├── YES → 비대칭 분석 패널 자동 활성화
 └── NO  → 세션 목록에 🟡 단독 상태로 표시 (추후 반대측 업로드 유도)
```

---

## 9. 향후 확장 고려사항 (Out of Scope v1.0)

- PDF/이미지 형태의 리포트 출력
- 다수 대상자 집단 평균과의 비교 기능
- 시간 흐름에 따른 동일 대상자 추적(경과 관찰)
- 서버 기반 데이터 영구 저장 및 멀티 기기 동기화
