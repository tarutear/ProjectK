# Marker-Based Motion Analysis Web App — MVP 개발 플랜

## 프로젝트 구조

```
motion-analysis/
├── public/
│   └── opencv/
│       └── opencv.js                    # OpenCV.js WASM 빌드 (정적 서빙)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # 메인 진입점
│   │   └── globals.css
│   ├── components/
│   │   ├── camera/
│   │   │   ├── CameraView.tsx           # 비디오 + 오버레이 캔버스 합성
│   │   │   ├── CameraSelector.tsx       # 장치 선택 드롭다운
│   │   │   └── OverlayCanvas.tsx        # 마커/각도 시각화 레이어
│   │   ├── markers/
│   │   │   ├── MarkerList.tsx           # 검출된 마커 목록 + 라벨 편집
│   │   │   └── MarkerLabel.tsx          # 인라인 편집 단일 마커 항목
│   │   ├── angles/
│   │   │   ├── AngleGroupBuilder.tsx    # 3-마커 순서 지정 UX
│   │   │   └── AngleGroupList.tsx       # 정의된 각도 그룹 목록
│   │   ├── session/
│   │   │   ├── SessionControls.tsx      # 시작/종료/Rep 저장 버튼
│   │   │   └── SessionStatus.tsx        # 현재 세션 상태 표시
│   │   ├── charts/
│   │   │   ├── AngleTimelineChart.tsx   # Recharts 각도 시계열
│   │   │   └── DistanceTimelineChart.tsx
│   │   └── export/
│   │       └── ExportButton.tsx         # CSV 다운로드 트리거
│   ├── workers/
│   │   └── vision.worker.ts             # OpenCV 처리 전용 Web Worker
│   ├── lib/
│   │   ├── opencv/
│   │   │   ├── loader.ts                # OpenCV.js 동적 로드 + 초기화
│   │   │   ├── detector.ts              # HSV 마커 검출 로직
│   │   │   └── types.ts                 # OpenCV 관련 타입 정의
│   │   ├── motion/
│   │   │   ├── kalman.ts                # Kalman Filter 구현
│   │   │   ├── geometry.ts              # 각도/거리 계산 (atan2, mm변환)
│   │   │   └── interpolation.ts         # 마커 가림 시 interpolation
│   │   ├── tracking/
│   │   │   └── remapper.ts              # 마커 ID 재매핑 (Hungarian Algorithm)
│   │   ├── storage/
│   │   │   ├── indexeddb.ts             # 세션 저장/조회 (idb 라이브러리)
│   │   │   └── localStorage.ts          # 설정값 persist
│   │   └── export/
│   │       └── csvExporter.ts           # CSV 생성 로직
│   ├── store/
│   │   ├── cameraStore.ts               # 카메라 장치/스트림 상태
│   │   ├── markerStore.ts               # 검출 마커 + 라벨 상태
│   │   ├── angleStore.ts                # 각도 그룹 정의 + 계산값
│   │   └── sessionStore.ts              # 세션/Rep 상태 + 타임시리즈 데이터
│   ├── hooks/
│   │   ├── useCamera.ts                 # 카메라 접근 + 스트림 관리
│   │   ├── useVisionWorker.ts           # Worker 통신 추상화
│   │   ├── useMarkerDetection.ts        # 검출 루프 조율
│   │   └── useFrameCapture.ts           # requestAnimationFrame 루프
│   └── types/
│       ├── marker.ts
│       ├── session.ts
│       └── geometry.ts
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 단계별 구현 순서

### Phase 1-1: 프로젝트 기반 설정 + 카메라 스트림

**목표:** 브라우저에서 카메라 영상을 받아 화면에 표시하고, 장치를 전환할 수 있다.

| 파일 | 역할 |
|------|------|
| `next.config.ts` | WASM MIME 타입 허용, COOP/COEP 헤더 설정 |
| `src/hooks/useCamera.ts` | `getUserMedia`, `enumerateDevices`, 스트림 교체 로직 |
| `src/store/cameraStore.ts` | 선택된 deviceId, 스트림 ref, 오류 상태 |
| `src/components/camera/CameraSelector.tsx` | 장치 목록 드롭다운, 전/후면 라벨 매핑 |
| `src/components/camera/CameraView.tsx` | `<video>` + `<canvas>` 절대 위치 겹침 레이아웃 |
| `src/app/page.tsx` | 최상위 레이아웃 조립 |

**기술 주의사항:**
- `video` 해상도를 `1280x720`으로 요청하되, 실제 해상도를 `videoWidth/videoHeight`로 읽어 캔버스와 1:1 매핑
- HTTPS 또는 localhost 필수 (getUserMedia 제약)
- 장치 목록 레이블은 권한 획득 후에만 채워짐 — 권한 요청 순서 중요

**완료 기준:**
- [ ] 카메라 영상이 실시간 표시됨
- [ ] 드롭다운으로 장치 전환 가능
- [ ] 전환 시 기존 스트림 track 정상 해제

---

### Phase 1-2: OpenCV.js 로딩 + Web Worker 아키텍처

**목표:** OpenCV.js를 WASM으로 로드하고, 메인 스레드 블로킹 없이 비전 처리 인프라를 완성한다.

| 파일 | 역할 |
|------|------|
| `public/opencv/opencv.js` | OpenCV.js WASM 빌드 정적 배치 |
| `src/lib/opencv/loader.ts` | Worker 내 OpenCV 초기화, `onRuntimeInitialized` 처리 |
| `src/lib/opencv/types.ts` | `cv.Mat` 등 TypeScript 타입 래퍼 |
| `src/workers/vision.worker.ts` | Worker 진입점: 메시지 라우팅, `ImageData` 수신 |
| `src/hooks/useVisionWorker.ts` | Worker 생성/소멸 관리, Transferable 활용 |
| `src/hooks/useFrameCapture.ts` | `requestAnimationFrame` 루프, `getImageData` → Worker 전달 |

**Worker 통신 프로토콜:**
```
Main → Worker:  { type: 'PROCESS_FRAME', payload: ImageData, frameId: number }
Worker → Main:  { type: 'DETECTION_RESULT', frameId, markers: RawMarker[], latencyMs: number }
```

**핵심 규칙:**
- `ImageData.data`는 Transferable로 전달해 복사 비용 제거
- `cv.Mat`은 반드시 `mat.delete()` 호출 (메모리 누수 방지)
- Worker 처리 중 도착한 프레임은 최신 1개만 유지, 나머지 폐기

**완료 기준:**
- [ ] Worker에서 `cv.getBuildInformation()` 성공
- [ ] 더미 `ImageData` 전송 시 Worker 응답 반환
- [ ] 메인 스레드 UI 블로킹 없음 (Chrome Performance 탭 확인)

---

### Phase 1-3: HSV 마커 검출 + 오버레이 시각화

**목표:** 노란색 마커를 실시간으로 검출하고 화면에 원과 ID를 오버레이로 표시한다.

| 파일 | 역할 |
|------|------|
| `src/lib/opencv/detector.ts` | HSV 임계값 검출, Contour 필터링, 중심점/반경 추출 |
| `src/lib/tracking/remapper.ts` | 이전/현재 프레임 마커 Hungarian 매칭 |
| `src/lib/motion/kalman.ts` | 마커 ID별 독립 Kalman Filter (x, y, vx, vy) |
| `src/store/markerStore.ts` | 검출 마커 배열, 라벨 맵, 가시성 상태 |
| `src/components/camera/OverlayCanvas.tsx` | Canvas 2D로 원/라벨/각도선 렌더링 |
| `src/components/markers/MarkerList.tsx` | 사이드 패널 마커 목록 + 라벨 편집 |

**HSV 검출 초기 파라미터:**
```
H: 20–35  (0–180 스케일)
S: 100–255
V: 100–255
Contour 최소 면적: 150 px²
Contour 최대 면적: 5000 px²
Circularity (4π·area/perimeter²): > 0.7
```

**검출 파이프라인 (Worker 내부):**
1. `ImageData` → `cv.Mat` (RGBA → BGR → HSV)
2. `cv.inRange` 마스크 생성
3. Morphology (close + open) 노이즈 제거
4. `cv.findContours` → 면적/원형도 필터
5. `cv.minEnclosingCircle` 중심점/반경 추출
6. 면적 내림차순 최대 8개 반환

**완료 기준:**
- [ ] 20mm 노란색 마커 제시 시 원형 오버레이 표시
- [ ] 10 FPS 이상 유지
- [ ] 마커 없을 때 오버레이 없음

---

### Phase 1-4: 마커 추적 고도화 + 라벨 UX

**목표:** 마커 가림/복귀 시 ID가 유지되고, 사용자가 클릭으로 라벨을 지정할 수 있다.

| 파일 | 역할 |
|------|------|
| `src/lib/tracking/remapper.ts` | 거리 기반 Hungarian Algorithm, 임계값 초과 시 신규 ID |
| `src/lib/motion/interpolation.ts` | 미검출 시 Kalman 예측값 대체, N프레임 초과 시 `occluded` 전환 |
| `src/lib/motion/kalman.ts` | `predict()` / `update()` 분리, 미검출 프레임은 `predict`만 |
| `src/components/markers/MarkerLabel.tsx` | 더블클릭 → `<input>` 전환, Enter/blur 시 저장 |
| `src/components/camera/OverlayCanvas.tsx` | 클릭 히트 테스트, `occluded` 마커 점선 표시 |
| `src/store/markerStore.ts` | `occluded` 상태, 라벨 localStorage 영속성 |

**Kalman Filter 상태 모델:**
```
상태 벡터: [x, y, vx, vy]
관측 벡터: [x, y]
관측 노이즈 R: ~2-3px
```

**완료 기준:**
- [ ] 마커를 1초 가렸다 복귀 시 동일 ID/라벨 유지
- [ ] 라벨 편집 후 새로고침 시에도 라벨 유지
- [ ] `occluded` 마커는 점선 원으로 표시

---

### Phase 1-5: 각도/거리 계산 + 각도 그룹 UX

**목표:** 사용자가 3개 마커로 관절 각도를 정의하고, 실시간 각도와 거리를 확인할 수 있다.

| 파일 | 역할 |
|------|------|
| `src/lib/motion/geometry.ts` | `calcAngle(proximal, apex, distal)`, `calcDistance(a, b, pxPerMm)` |
| `src/store/angleStore.ts` | 각도 그룹 정의 배열, 실시간 계산값, px/mm 스케일 팩터 |
| `src/components/angles/AngleGroupBuilder.tsx` | 3-step 마커 선택 위저드 (근위 → 정점 → 원위) |
| `src/components/angles/AngleGroupList.tsx` | 그룹 목록, 실시간 각도값, 삭제 버튼 |
| `src/components/camera/OverlayCanvas.tsx` | 벡터 선 + 각도 호(arc) + 수치 레이블 렌더링 |

**각도 계산:**
```typescript
function calcAngle(proximal: Point, apex: Point, distal: Point): number {
  const v1 = { x: proximal.x - apex.x, y: proximal.y - apex.y };
  const v2 = { x: distal.x - apex.x,   y: distal.y - apex.y };
  const dot   = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;
  return Math.abs(Math.atan2(Math.abs(cross), dot) * (180 / Math.PI));
}
```

**mm/px 변환:**
- 기본값: 검출된 마커 반경(px) ÷ 10mm로 자동 계산
- 옵션: 두 점 클릭 + 실제 거리 입력으로 수동 캘리브레이션

**완료 기준:**
- [ ] 3개 마커 선택 후 각도 그룹 생성 가능
- [ ] 오버레이에 각도 호 + 수치 실시간 업데이트
- [ ] 두 마커 간 거리가 mm로 표시

---

### Phase 1-6: 세션 관리 + IndexedDB 저장

**목표:** 측정 구간을 시작/종료하고, Rep 단위로 IndexedDB에 저장한다.

| 파일 | 역할 |
|------|------|
| `src/lib/storage/indexeddb.ts` | `idb` 라이브러리 스키마, `saveSession`, `loadSession`, `listSessions` |
| `src/store/sessionStore.ts` | 세션 ID (nanoid), Rep 배열, circular buffer (최대 10,000 프레임) |
| `src/components/session/SessionControls.tsx` | 세션 시작, Rep 시작/종료, 세션 종료, 경과 시간 표시 |
| `src/components/session/SessionStatus.tsx` | 현재 Rep 번호, 데이터 포인트 수, 저장 상태 인디케이터 |
| `src/lib/export/csvExporter.ts` | sessionId + timestamp + positions + angles → CSV Blob 다운로드 |
| `src/components/export/ExportButton.tsx` | 다운로드 버튼, 세션 선택 드롭다운 |

**IndexedDB 스키마:**
```
DB: motion-analysis-db

Store: sessions
  key: sessionId (nanoid)
  value: { sessionId, createdAt, reps: Rep[] }

Store: repData
  key: [sessionId, repIndex]
  value: { startTime, endTime, frames: FrameData[] }
```

**완료 기준:**
- [ ] 세션 시작 → Rep 시작 → Rep 종료 → 세션 종료 플로우 동작
- [ ] 브라우저 재시작 후 IndexedDB 데이터 조회 가능
- [ ] CSV에 환자 식별 정보 없이 sessionId + 타임스탬프만 포함

> Phase 1-5와 병렬 개발 가능 (공유 의존성 없음)

---

### Phase 1-7: 결과 시각화 + 통합 테스트

**목표:** 시계열 그래프를 완성하고 전체 플로우를 통합 검증한다.

| 파일 | 역할 |
|------|------|
| `src/components/charts/AngleTimelineChart.tsx` | Recharts LineChart, 각도 그룹별 색상, 가림 구간 점선 |
| `src/components/charts/DistanceTimelineChart.tsx` | 거리 시계열, px/mm 이중 Y축 |
| `src/app/page.tsx` | 최종 레이아웃 조립 |
| `src/lib/storage/localStorage.ts` | HSV 설정, 캘리브레이션 스케일 persist |

**최종 레이아웃:**
```
┌──────────────────────────────────┬──────────────────┐
│  CameraView (비디오 + 오버레이)    │  MarkerList      │
│                                   │  AngleGroupList  │
│                                   │  SessionControls │
├──────────────────────────────────┴──────────────────┤
│  AngleTimelineChart  │  DistanceTimelineChart        │
└─────────────────────────────────────────────────────┘
```

**완료 기준:**
- [ ] 세션 종료 후 Rep 단위 차트 확인 가능
- [ ] CSV Excel에서 정상 열림
- [ ] 전체 플로우 (카메라 → 검출 → 각도 그룹 → 세션 → 차트 → CSV) 끊김 없이 동작
- [ ] Chrome DevTools 기준 20 FPS 이상

---

## 단계 간 의존성

```
Phase 1-1 (카메라)
    ↓
Phase 1-2 (OpenCV + Worker)
    ↓
Phase 1-3 (검출 + 오버레이)
    ↓
Phase 1-4 (추적 + 라벨)
    ↓
Phase 1-5 (각도/거리) ←──병렬 가능──→ Phase 1-6 (세션 저장)
    ↓                                       ↓
    └───────────── Phase 1-7 (통합) ────────┘
```

---

## 기술적 고려사항

### OpenCV.js WASM 로딩 전략

1. `public/opencv/`에 정적 배치, `next.config.ts`에서 WASM MIME + 캐시 헤더 설정
2. Worker 내 `importScripts('/opencv/opencv.js')` 1회 로드 — 메인 스레드에 OpenCV 없음
3. Worker 초기화 상태: `idle → loading → ready → error` — `ready` 확인 후 프레임 전송 시작
4. 성능 병목 발생 시 커스텀 최소 빌드(`imgproc`, `core`만, ~3MB) 적용

### 성능 예산 (프레임당 목표)

| 단계 | 예상 시간 |
|------|----------|
| `getImageData()` | ~2ms |
| Worker 전송 (Transferable) | ~0.5ms |
| HSV 처리 (Worker) | ~15ms |
| Kalman + 기하 계산 | ~1ms |
| Canvas 렌더 | ~2ms |
| **합계** | **~20.5ms → 약 48 FPS 이론치** |

처리용 해상도는 640×480으로 다운스케일 후 오버레이 좌표만 원본 해상도로 역변환.

### 메모리 관리 규칙

- Worker 내 `cv.Mat`은 `try/finally`로 `mat.delete()` 보장
- `ImageData` 버퍼는 Transferable 전달 후 소유권 이전
- 세션 타임시리즈 버퍼: 최대 10,000 프레임 circular buffer

### React 렌더링 최적화

- 마커 위치 업데이트는 Canvas 직접 렌더 (React state 우회, 60fps 오버레이)
- Zustand selector로 불필요한 리렌더 방지
- 차트는 세션 종료 시에만 리렌더

### 주요 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| Safari WASM 제약 | Chrome 우선 개발, Safari는 메인 스레드 폴백 |
| 조명 조건에 따른 오탐 | HSV 슬라이더 실시간 임계값 조정 UI 제공 |
| IndexedDB 저장 실패 | `try/catch` + 메모리 버퍼 유지 후 재시도 |
| 마커 크기 가정 깨짐 | mm/px 수동 캘리브레이션을 기본값으로 사용 |
