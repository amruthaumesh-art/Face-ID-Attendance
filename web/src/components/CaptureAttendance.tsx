import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Image as ImageIcon,
  Layers,
  Lock,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { SAMPLE_ASSETS } from '../data/mockData';
import { analyzeClassroomPhoto, uploadRowPhotoVerification } from '../services/api';
import { correctLiveAttendance } from '../services/liveApi';
import type {
  AcademicYear,
  AttendanceSession,
  CourseClass,
  DetectionScenario,
  EnrolledStudent,
  SubjectItem,
  User,
} from '../types/attendance';

interface CaptureAttendanceProps {
  user: User;
  classes: CourseClass[];
  subjects: SubjectItem[];
  students: EnrolledStudent[];
  confidenceThreshold?: number;
  editWindowMinutes?: number;
  initialClassId?: string;
  onSessionCreated: (session: AttendanceSession) => void;
  onSessionUpdated: (session: AttendanceSession) => void;
  onProceedToReview: (sessionId: string) => void;
}

type ResultTab = 'all' | 'present' | 'absent' | 'unknown';

const ROW_LABEL_MAP: Record<number, string> = {
  1: 'Row 1 (Front Benches)',
  2: 'Row 2 (Middle Benches)',
  3: 'Row 3 (Rear Benches)',
};

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export const CaptureAttendance: React.FC<CaptureAttendanceProps> = ({
  user,
  classes,
  subjects,
  students,
  confidenceThreshold = 95,
  editWindowMinutes = 60,
  initialClassId,
  onSessionCreated,
  onSessionUpdated,
  onProceedToReview,
}) => {
  const initialClassObj = classes.find((c) => c.id === initialClassId) || classes[0];

  // STEP 1: Academic Year (1st PUC / 2nd PUC), Class, Subject, Topic, Date, Time
  const [selectedYear, setSelectedYear] = useState<AcademicYear>(
    initialClassObj?.academicYear || '1st PUC'
  );
  const yearFilteredClasses = classes.filter((c) => c.academicYear === selectedYear);
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassObj?.id || yearFilteredClasses[0]?.id || classes[0]?.id || ''
  );

  const yearFilteredSubjects = subjects.filter((s) => s.academicYear === selectedYear);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    yearFilteredSubjects.find((s) => s.classId === selectedClassId)?.id ||
      yearFilteredSubjects[0]?.id ||
      ''
  );

  const [topicName, setTopicName] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(() => getTodayDateString());
  const [sessionTime, setSessionTime] = useState<string>(() => getCurrentTimeString());
  const [scenario, setScenario] = useState<DetectionScenario>('low_confidence_unknown');

  // STEP 2: Classroom Photo
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // STEP 3 & 4: Analyze & Attendance Details
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('all');

  // Row-wise upload + camera state
  const [selectedRowNumber, setSelectedRowNumber] = useState<number>(3);
  const [rowPreviewUrl, setRowPreviewUrl] = useState<string | null>(null);
  const [rowFileName, setRowFileName] = useState<string>('');
  const [isVerifyingRow, setIsVerifyingRow] = useState(false);
  const [showRowPanelManual, setShowRowPanelManual] = useState(false);

  const [isRowCameraOpen, setIsRowCameraOpen] = useState(false);
  const [isStartingRowCamera, setIsStartingRowCamera] = useState(false);
  const [rowCapturedPreviewUrl, setRowCapturedPreviewUrl] = useState<string | null>(null);
  const [rowCameraError, setRowCameraError] = useState<string | null>(null);
  const rowVideoRef = useRef<HTMLVideoElement | null>(null);
  const rowStreamRef = useRef<MediaStream | null>(null);
  const rowUploadInputRef = useRef<HTMLInputElement | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const stopRowCameraStream = () => {
    if (rowStreamRef.current) {
      rowStreamRef.current.getTracks().forEach((track) => track.stop());
      rowStreamRef.current = null;
    }
    if (rowVideoRef.current) {
      rowVideoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (initialClassId) {
      const target = classes.find((c) => c.id === initialClassId);
      if (target) {
        setSelectedYear(target.academicYear);
        setSelectedClassId(target.id);
        const firstSub = subjects.find(
          (s) => s.academicYear === target.academicYear && s.classId === target.id
        );
        setSelectedSubjectId(firstSub?.id || '');
      }
    }
  }, [initialClassId, classes, subjects]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOpen]);

  useEffect(() => {
    if (isRowCameraOpen && rowVideoRef.current && rowStreamRef.current) {
      rowVideoRef.current.srcObject = rowStreamRef.current;
      rowVideoRef.current.play().catch(() => {});
    }
  }, [isRowCameraOpen]);

  useEffect(() => {
    return () => {
      stopCameraStream();
      stopRowCameraStream();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (rowPreviewUrl && rowPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(rowPreviewUrl);
      }
    };
  }, [rowPreviewUrl]);

  const selectedClass =
    yearFilteredClasses.find((c) => c.id === selectedClassId) || yearFilteredClasses[0];
  const resolvedClassId = selectedClass?.id || '';
  const availableSubjects = subjects.filter((s) => s.academicYear === selectedYear);
  const selectedSubject =
    availableSubjects.find((s) => s.id === selectedSubjectId) || availableSubjects[0];
  const resolvedSubjectId = selectedSubject?.id || '';

  const selectedRowName = ROW_LABEL_MAP[selectedRowNumber] || `Row ${selectedRowNumber}`;

  const isStep1Complete = Boolean(
    selectedYear &&
      resolvedClassId &&
      resolvedSubjectId &&
      topicName.trim().length > 0 &&
      sessionDate.trim().length > 0 &&
      sessionTime.trim().length > 0
  );
  const isStep2Complete = Boolean(
    isStep1Complete && photoPreviewUrl && !isCameraOpen && !capturedPreviewUrl
  );
  const isStep3Complete = Boolean(activeSession);

  // If Step 1 becomes incomplete, reset active session & camera cleanly
  useEffect(() => {
    if (!isStep1Complete) {
      stopCameraStream();
      stopRowCameraStream();
      setIsCameraOpen(false);
      setIsRowCameraOpen(false);
      setActiveSession(null);
    }
  }, [isStep1Complete]);

  // Main Classroom Photo handlers
  const handleOpenCamera = async () => {
    setCameraError(null);
    setAnalysisError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera capture is not supported in this browser context. Please use Upload Photo instead.'
      );
      return;
    }

    stopRowCameraStream();
    setIsRowCameraOpen(false);
    stopCameraStream();
    setCapturedPreviewUrl(null);
    setIsStartingCamera(true);

    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      streamRef.current = mediaStream;
      setIsCameraOpen(true);
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in browser settings or use Upload Photo.'
          : 'Unable to access laptop or mobile camera. Check device permissions or use Upload Photo.';
      setCameraError(msg);
      setIsCameraOpen(false);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPreviewUrl(dataUrl);
  };

  const handleCancelCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPreviewUrl(null);
  };

  const handleRetakePhoto = () => {
    setCapturedPreviewUrl(null);
    void handleOpenCamera();
  };

  const handleUseCapturedPhoto = () => {
    if (!capturedPreviewUrl) return;
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    setPhotoPreviewUrl(capturedPreviewUrl);
    setPhotoFileName(`classroom_camera_${stamp}.jpg`);
    setCapturedPreviewUrl(null);
    setCameraError(null);
    setAnalysisError(null);
    setActiveSession(null);
  };

  const handleTriggerUploadPicker = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPreviewUrl(null);
    setCameraError(null);
    uploadInputRef.current?.click();
  };

  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPreviewUrl(null);
    setCameraError(null);
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    const url = URL.createObjectURL(file);
    setPhotoPreviewUrl(url);
    setPhotoFileName(file.name);
    setAnalysisError(null);
    setActiveSession(null);
    e.target.value = '';
  };

  const handleLoadSampleMainPhoto = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPreviewUrl(null);
    setCameraError(null);
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(SAMPLE_ASSETS.lectureHall);
    setPhotoFileName('sample_lecture_hall_capture.jpg');
    setAnalysisError(null);
    setActiveSession(null);
  };

  const handleClearMainPhoto = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedPreviewUrl(null);
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(null);
    setPhotoFileName('');
    setActiveSession(null);
  };

  const handleRunAnalysis = async () => {
    if (!selectedClass || !selectedSubject || !isStep1Complete) return;
    if (!photoPreviewUrl) {
      setAnalysisError('Please capture or upload a classroom photograph in Step 2 first.');
      return;
    }

    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const session = await analyzeClassroomPhoto(
        {
          academicYear: selectedYear,
          classId: selectedClass.id,
          subjectId: selectedSubject.id,
          topicName: topicName.trim(),
          sessionDate,
          sessionTime,
          photoFileName: photoFileName || 'classroom_capture.jpg',
          scenario,
          photoUrl: photoPreviewUrl ?? undefined,
        },
        user,
        {
          classes,
          subjects,
          allStudents: students,
          confidenceThreshold,
          editWindowMinutes,
        }
      );
      setActiveSession(session);
      setResultTab('all');
      onSessionCreated(session);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Failed to process classroom photo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Row-Wise Camera & Upload handlers
  const handleOpenRowCamera = async () => {
    setRowCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setRowCameraError(
        'Camera capture is not supported in this browser context. Please use Upload Row Photo instead.'
      );
      return;
    }

    stopCameraStream();
    setIsCameraOpen(false);
    stopRowCameraStream();
    setRowCapturedPreviewUrl(null);
    setIsStartingRowCamera(true);

    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      rowStreamRef.current = mediaStream;
      setIsRowCameraOpen(true);
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in browser settings or use Upload Row Photo.'
          : 'Unable to access laptop or mobile camera. Check device permissions or use Upload Row Photo.';
      setRowCameraError(msg);
      setIsRowCameraOpen(false);
    } finally {
      setIsStartingRowCamera(false);
    }
  };

  const handleTakeRowPhoto = () => {
    const video = rowVideoRef.current;
    if (!video) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopRowCameraStream();
    setIsRowCameraOpen(false);
    setRowCapturedPreviewUrl(dataUrl);
  };

  const handleCancelRowCamera = () => {
    stopRowCameraStream();
    setIsRowCameraOpen(false);
    setRowCapturedPreviewUrl(null);
  };

  const handleRetakeRowPhoto = () => {
    setRowCapturedPreviewUrl(null);
    void handleOpenRowCamera();
  };

  const handleUseCapturedRowPhoto = () => {
    if (!rowCapturedPreviewUrl) return;
    if (rowPreviewUrl && rowPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(rowPreviewUrl);
    }
    const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    setRowPreviewUrl(rowCapturedPreviewUrl);
    setRowFileName(`row_${selectedRowNumber}_camera_${stamp}.jpg`);
    setRowCapturedPreviewUrl(null);
    setRowCameraError(null);
  };

  const handleTriggerRowUploadPicker = () => {
    stopRowCameraStream();
    setIsRowCameraOpen(false);
    setRowCapturedPreviewUrl(null);
    setRowCameraError(null);
    rowUploadInputRef.current?.click();
  };

  const handleRowFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopRowCameraStream();
    setIsRowCameraOpen(false);
    setRowCapturedPreviewUrl(null);
    setRowCameraError(null);
    if (rowPreviewUrl && rowPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(rowPreviewUrl);
    }
    setRowPreviewUrl(URL.createObjectURL(file));
    setRowFileName(file.name);
    e.target.value = '';
  };

  const handleClearRowPhoto = () => {
    stopRowCameraStream();
    setIsRowCameraOpen(false);
    setRowCapturedPreviewUrl(null);
    if (rowPreviewUrl && rowPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(rowPreviewUrl);
    }
    setRowPreviewUrl(null);
    setRowFileName('');
  };

  const handleLoadSampleRowPhoto = () => {
    stopRowCameraStream();
    setIsRowCameraOpen(false);
    setRowCapturedPreviewUrl(null);
    setRowCameraError(null);
    if (rowPreviewUrl && rowPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(rowPreviewUrl);
    }
    setRowPreviewUrl(SAMPLE_ASSETS.rowCapture);
    setRowFileName(`sample_row_${selectedRowNumber}_capture.jpg`);
  };

  const handleUploadRowVerification = async () => {
    if (!activeSession || !rowPreviewUrl) return;
    setIsVerifyingRow(true);
    setAnalysisError(null);
    try {
      const updated = await uploadRowPhotoVerification(
        activeSession,
        {
          sessionId: activeSession.id,
          rowNumber: selectedRowNumber,
          rowLabel: selectedRowName,
          photoFileName: rowFileName || `row_${selectedRowNumber}.jpg`,
          photoUrl: rowPreviewUrl ?? undefined,
        },
        confidenceThreshold
      );
      setActiveSession(updated);
      onSessionUpdated(updated);
      handleClearRowPhoto();
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Failed to process the row photo.');
    } finally {
      setIsVerifyingRow(false);
    }
  };

  const handleResolveUnknown = (unknownId: string, studentId?: string) => {
    if (!activeSession) return;
    let updatedStudents = activeSession.students;
    let assignedStudentName: string | undefined;

    if (studentId) {
      const target = activeSession.students.find((s) => s.id === studentId);
      assignedStudentName = target?.name;
      if (activeSession.isLive && target && target.status === 'absent') {
        // Save the manual match in PostgreSQL (audited correction).
        correctLiveAttendance(
          activeSession,
          studentId,
          'present',
          user.name,
          'Matched from unknown face during capture review'
        ).catch((err) =>
          setAnalysisError(
            `Could not save the match for ${target.name}: ${err instanceof Error ? err.message : err}`
          )
        );
      }
      updatedStudents = activeSession.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              status: 'present',
              confidence: 95.5,
              manuallyEdited: true,
              editNote: 'Matched from unknown face crop during capture review.',
            }
          : s
      );
    }

    const updatedUnknowns = activeSession.unknownFaces.map((u) =>
      u.id === unknownId
        ? {
            ...u,
            resolutionStatus: studentId ? ('assigned' as const) : ('dismissed' as const),
            assignedStudentId: studentId,
            assignedStudentName,
          }
        : u
    );

    const unresolvedCount = updatedUnknowns.filter(
      (u) => u.resolutionStatus === 'unresolved'
    ).length;
    const presentCount = updatedStudents.filter((s) => s.status === 'present').length;
    const absentCount = updatedStudents.filter((s) => s.status === 'absent').length;

    const updatedSession: AttendanceSession = {
      ...activeSession,
      students: updatedStudents,
      unknownFaces: updatedUnknowns,
      presentCount,
      absentCount,
      unknownCount: unresolvedCount,
      warnings: {
        ...activeSession.warnings,
        unknownFacesCount: unresolvedCount,
      },
    };

    setActiveSession(updatedSession);
    onSessionUpdated(updatedSession);
  };

  const threshold = confidenceThreshold;
  const hasLowConfidence = activeSession
    ? activeSession.averageConfidence < threshold
    : false;
  const hasAnyWarning = activeSession
    ? hasLowConfidence ||
      activeSession.warnings.unknownFacesCount > 0 ||
      activeSession.warnings.duplicateMatches.length > 0 ||
      activeSession.warnings.headcountMismatch !== null
    : false;

  const shouldShowRowUpload =
    activeSession &&
    (hasLowConfidence || activeSession.warnings.unknownFacesCount > 0 || showRowPanelManual);

  const presentStudents = activeSession
    ? activeSession.students.filter((s) => s.status === 'present')
    : [];
  const absentStudents = activeSession
    ? activeSession.students.filter((s) => s.status === 'absent')
    : [];

  const filteredStudents = activeSession
    ? activeSession.students.filter((s) => {
        if (resultTab === 'present') return s.status === 'present';
        if (resultTab === 'absent') return s.status === 'absent';
        return true;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Workflow Stepper Summary */}
      <nav aria-label="Capture workflow progress" className="uni-card p-4">
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              step: 1,
              title: 'Class & Topic Details',
              done: isStep1Complete,
              active: !isStep1Complete,
            },
            {
              step: 2,
              title: 'Classroom Photo',
              done: isStep2Complete,
              active: isStep1Complete && !isStep2Complete,
            },
            {
              step: 3,
              title: 'Analyze Attendance',
              done: isStep3Complete,
              active: isStep2Complete && !isStep3Complete,
            },
            {
              step: 4,
              title: 'Attendance Details',
              done: isStep3Complete,
              active: isStep3Complete,
            },
          ].map((item) => (
            <li
              key={item.step}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border transition-colors ${
                item.active
                  ? 'bg-[#FAF7F0] border-[#D6A84B] text-[#292929]'
                  : item.done
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-[#FAF7F0]/60 border-[#E7DFCE] text-[#5C5552]'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 tabular-nums ${
                  item.done
                    ? 'bg-emerald-600 text-white'
                    : item.active
                      ? 'bg-[#681C2D] text-[#D6A84B]'
                      : 'bg-[#E7DFCE] text-[#5C5552]'
                }`}
              >
                {item.done ? <Check className="w-3.5 h-3.5" /> : item.step}
              </span>
              <span className="text-[14px] font-medium truncate">{item.title}</span>
            </li>
          ))}
        </ol>
      </nav>

      {/* STEP 1 – ACADEMIC YEAR (1ST/2ND PUC), CLASS, SUBJECT & TOPIC DETAILS */}
      <section className="uni-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F0EAE0]">
          <div>
            <div className="text-[16px] font-medium text-[#681C2D]">
              Step 1 · Academic Year, Class, Subject &amp; Topic Details
            </div>
            <h2 className="font-display text-[22px] font-semibold text-[#292929] mt-0.5">
              1st / 2nd PUC Session Setup
            </h2>
          </div>
          {isStep1Complete ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-normal text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Required session details completed</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-normal text-[#5C5552]">
              <Lock className="w-3.5 h-3.5 text-[#8C7F78]" />
              <span>Complete all required fields to unlock Classroom Photo</span>
            </span>
          )}
        </div>

        {/* Separate 1st PUC and 2nd PUC Selection */}
        <div>
          <span className="block text-[14px] font-medium text-[#292929] mb-2">
            Academic Year <span className="text-red-600">*</span>
          </span>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {(['1st PUC', '2nd PUC'] as const).map((year) => {
              const yearClassesCount = classes.filter((c) => c.academicYear === year).length;
              const isSelected = selectedYear === year;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    setSelectedYear(year);
                    const nextClasses = classes.filter((c) => c.academicYear === year);
                    const nextClassId = nextClasses[0]?.id || '';
                    setSelectedClassId(nextClassId);
                    const nextSubject = subjects.find(
                      (s) => s.academicYear === year && s.classId === nextClassId
                    );
                    setSelectedSubjectId(nextSubject?.id || '');
                    setTopicName('');
                    setActiveSession(null);
                  }}
                  className={`px-4 py-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-[#681C2D] border-[#481321] text-white shadow-xs'
                      : 'bg-white border-[#D6CFC2] text-[#292929] hover:border-[#681C2D]/60 hover:bg-[#FAF7F0]'
                  }`}
                >
                  <div className="text-[14px] font-semibold">{year}</div>
                  <div
                    className={`text-[12px] font-normal ${
                      isSelected ? 'text-[#D6A84B]' : 'text-[#5C5552]'
                    }`}
                  >
                    {yearClassesCount} assigned class{yearClassesCount === 1 ? '' : 'es'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Class & Subject Selection */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label
                htmlFor="class-select"
                className="block text-[14px] font-medium text-[#292929] mb-1.5"
              >
                {selectedYear} Class &amp; Section <span className="text-red-600">*</span>
              </label>
              <select
                id="class-select"
                value={resolvedClassId}
                onChange={(e) => {
                  const nextClassId = e.target.value;
                  setSelectedClassId(nextClassId);
                  const nextSub = subjects.find(
                    (s) => s.academicYear === selectedYear && s.classId === nextClassId
                  );
                  setSelectedSubjectId(nextSub?.id || '');
                  setTopicName('');
                  setActiveSession(null);
                }}
                className="uni-input w-full px-3.5 py-2.5 text-[14px] min-h-[44px]"
              >
                {yearFilteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name} ({c.section})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="subject-select"
                className="block text-[14px] font-medium text-[#292929] mb-1.5"
              >
                Subject <span className="text-red-600">*</span>
              </label>
              <select
                id="subject-select"
                value={resolvedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setActiveSession(null);
                }}
                className="uni-input w-full px-3.5 py-2.5 text-[14px] min-h-[44px]"
              >
                {availableSubjects.length === 0 ? (
                  <option value="">No subjects available for {selectedYear}</option>
                ) : (
                  availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedClass && (
              <div className="p-4 bg-[#FAF7F0] border border-[#D6A84B]/50 rounded-lg space-y-1.5">
                <div className="text-[14px] font-medium text-[#292929] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#681C2D] shrink-0" />
                  <span>
                    {selectedClass.academicYear} · {selectedClass.code} ({selectedClass.section})
                  </span>
                </div>
                <div className="text-[12px] font-normal text-[#5C5552]">
                  Room: {selectedClass.room} · Regular Schedule: {selectedClass.schedule}
                </div>
                <div className="text-[12px] font-normal text-[#5C5552] tabular-nums">
                  Active Enrolled Students:{' '}
                  <span className="font-semibold text-[#681C2D]">
                    {
                      students.filter(
                        (st) =>
                          st.classId === selectedClass.id &&
                          st.academicYear === selectedYear &&
                          st.enrollmentStatus !== 'Inactive'
                      ).length
                    }{' '}
                    students
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Topic Name, Date, Time, Scenario */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label
                htmlFor="topic-name-input"
                className="block text-[14px] font-medium text-[#292929] mb-1.5"
              >
                Enter Topic Name <span className="text-red-600">*</span>
              </label>
              <input
                id="topic-name-input"
                type="text"
                required
                value={topicName}
                onChange={(e) => {
                  setTopicName(e.target.value);
                  setActiveSession(null);
                }}
                placeholder="Type the topic taught in this class session..."
                className="uni-input w-full px-3.5 py-2.5 text-[14px] min-h-[44px]"
              />
              <p className="mt-1 text-[12px] font-normal text-[#5C5552]">
                Required: manually type the lecture topic before proceeding to Classroom Photo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="session-date-input"
                  className="block text-[14px] font-medium text-[#292929] mb-1.5"
                >
                  Session Date <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#8C7F78] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="session-date-input"
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => {
                      setSessionDate(e.target.value);
                      setActiveSession(null);
                    }}
                    className="uni-input w-full pl-9 pr-3 py-2 text-[14px] tabular-nums min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="session-time-input"
                  className="block text-[14px] font-medium text-[#292929] mb-1.5"
                >
                  Session Time <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#8C7F78] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="session-time-input"
                    type="time"
                    required
                    value={sessionTime}
                    onChange={(e) => {
                      setSessionTime(e.target.value);
                      setActiveSession(null);
                    }}
                    className="uni-input w-full pl-9 pr-3 py-2 text-[14px] tabular-nums min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {selectedClass?.isLive ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-900 leading-relaxed">
                <span className="font-semibold">Live face recognition.</span> The photo is sent to the
                FACE ID server (SCRFD detection + our trained ArcFace model) and the result is saved in
                PostgreSQL.
              </div>
            ) : (
            <div>
              <label
                htmlFor="scenario-select"
                className="block text-[14px] font-medium text-[#292929] mb-1.5"
              >
                Sample Detection Scenario
              </label>
              <select
                id="scenario-select"
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value as DetectionScenario);
                  setActiveSession(null);
                }}
                className="uni-input w-full px-3.5 py-2.5 text-[14px] min-h-[44px]"
              >
                <option value="low_confidence_unknown">
                  Low Confidence (&lt;{threshold}%) &amp; Unknown Rear Faces
                </option>
                <option value="duplicate_headcount_mismatch">
                  Duplicate Match &amp; Headcount Mismatch Alert
                </option>
                <option value="high_confidence">
                  Standard Nominal Capture (&gt;{threshold}% Confidence)
                </option>
              </select>
            </div>
            )}
          </div>
        </div>
      </section>

      {/* Locked Prompt when Step 1 is incomplete (Hides Step 2 Capture & Upload completely) */}
      {!isStep1Complete && (
        <section className="uni-card p-6 bg-[#FAF7F0] border-dashed border-[#D6CFC2] text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-lg bg-white border border-[#D6A84B]/60 flex items-center justify-center text-[#681C2D]">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-display text-[18px] font-semibold text-[#292929]">
            Step 2 (Classroom Photo) is Locked
          </h3>
          <p className="text-[14px] font-normal text-[#5C5552] max-w-lg mx-auto leading-relaxed">
            Type the <span className="font-medium text-[#292929]">Topic Name</span> and confirm the class, subject, session date, and session time in Step 1 to reveal the classroom photo capture and upload options.
          </p>
        </section>
      )}

      {/* STEP 2 – CLASSROOM PHOTO (Shown ONLY after Step 1 required details are completed) */}
      {isStep1Complete && (
        <section className="uni-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[16px] font-medium text-[#681C2D]">
                Step 2 · Classroom Photo
              </div>
              <h2 className="font-display text-[22px] font-semibold text-[#292929] mt-0.5">
                Classroom Photo Upload &amp; Preview
              </h2>
            </div>
            <button
              type="button"
              onClick={handleLoadSampleMainPhoto}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#681C2D] bg-[#FAF7F0] hover:bg-[#481321] hover:text-white border border-[#D6A84B]/60 hover:border-[#481321] rounded-lg transition-colors whitespace-nowrap"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Load Sample Lecture Photo</span>
            </button>
          </div>

          {/* Hidden File Input for Upload Photo Button */}
          <input
            ref={uploadInputRef}
            id="classroom-photo-input"
            type="file"
            accept="image/*"
            onChange={handleMainFileChange}
            className="sr-only"
          />

          {/* Side-by-Side Capture Photo & Upload Photo Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleOpenCamera}
              disabled={isStartingCamera}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#681C2D] hover:bg-[#481321] disabled:opacity-60 text-white text-[14px] font-semibold rounded-lg shadow-xs transition-colors min-h-[44px] whitespace-nowrap"
            >
              <Camera className="w-4 h-4 text-[#D6A84B] shrink-0" />
              <span>{isStartingCamera ? 'Opening Camera...' : 'Capture Photo'}</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerUploadPicker}
              className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FAF7F0] hover:bg-[#481321] text-[#681C2D] hover:text-white border border-[#D6A84B]/60 hover:border-[#481321] text-[14px] font-semibold rounded-lg transition-colors min-h-[44px] whitespace-nowrap"
            >
              <Upload className="w-4 h-4 text-[#681C2D] group-hover:text-[#D6A84B] shrink-0 transition-colors" />
              <span>Upload Photo</span>
            </button>
          </div>

          {cameraError && (
            <div
              role="alert"
              className="p-3 text-[12px] font-normal text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-2"
            >
              <span>{cameraError}</span>
              <button
                type="button"
                onClick={() => setCameraError(null)}
                aria-label="Dismiss camera error"
                className="text-red-500 hover:text-red-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Preview Area */}
          {isCameraOpen ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-[#681C2D]/40 bg-[#481321] aspect-video max-h-[420px] mx-auto">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[12px] font-normal text-[#5C5552]">
                  Live camera preview active
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCancelCamera}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#5C5552] bg-white hover:bg-[#FAF7F0] border border-[#D6CFC2] rounded-lg transition-colors min-h-[40px]"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTakePhoto}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors min-h-[40px]"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>
            </div>
          ) : capturedPreviewUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-[#D6A84B] bg-[#481321] aspect-video max-h-[420px] mx-auto">
                <img
                  src={capturedPreviewUrl}
                  alt="Captured classroom photo preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[12px] font-normal text-[#681C2D]">
                  Photo captured — confirm to use for attendance analysis
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#292929] bg-white hover:bg-[#FAF7F0] border border-[#D6CFC2] rounded-lg transition-colors min-h-[40px]"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleUseCapturedPhoto}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors min-h-[40px]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Use Photo</span>
                  </button>
                </div>
              </div>
            </div>
          ) : photoPreviewUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-[#E7DFCE] bg-[#481321] aspect-video max-h-[420px] mx-auto">
                <img
                  src={photoPreviewUrl}
                  alt="Classroom capture preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-normal text-[#5C5552]">
                <span className="font-mono truncate max-w-xs">{photoFileName}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTriggerUploadPicker}
                    className="text-[14px] font-semibold text-[#681C2D] hover:text-[#481321]"
                  >
                    Replace photo
                  </button>
                  <button
                    type="button"
                    onClick={handleClearMainPhoto}
                    className="text-[14px] font-semibold text-[#5C5552] hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#D6CFC2] bg-[#FAF7F0] rounded-xl p-8 sm:p-10 text-center min-h-[200px]">
              <div className="w-11 h-11 rounded-xl bg-white border border-[#D6A84B]/60 flex items-center justify-center text-[#681C2D] mb-3">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="text-[14px] font-medium text-[#292929]">
                No classroom photograph selected
              </div>
              <p className="text-[12px] font-normal text-[#5C5552] mt-1 max-w-sm leading-relaxed">
                Use Capture Photo to open your laptop or mobile camera, or Upload Photo to choose an existing image file.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-[#F0EAE0] text-[12px] font-normal text-[#5C5552] flex flex-wrap items-center justify-between gap-2">
            <span>
              {selectedClass?.isLive
                ? 'Privacy notice: the photo is sent to the FACE ID server for recognition and is not stored; only attendance is saved.'
                : 'Privacy notice: Preview stays in browser memory; biometric photos are not stored.'}
            </span>
            <span className="font-mono">
              {selectedClass?.isLive
                ? `POST /attendance/mark-from-recognition/${selectedClass.id}`
                : 'Demo class · simulated result'}
            </span>
          </div>
        </section>
      )}

      {/* STEP 3 – ANALYZE ATTENDANCE (Shown after Step 1 is complete; enabled when Step 2 photo is ready) */}
      {isStep1Complete && (
        <section className="uni-card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[16px] font-medium text-[#681C2D]">
                Step 3 · Analyze Attendance
              </div>
              <h2 className="font-display text-[22px] font-semibold text-[#292929]">
                Process Classroom Attendance
              </h2>
              <p className="text-[14px] font-normal text-[#5C5552] leading-relaxed">
                {selectedYear} · {selectedClass?.code} ({selectedClass?.section}) ·{' '}
                {selectedSubject?.name} · Topic:{' '}
                <span className="font-medium text-[#292929]">{topicName.trim()}</span> ·{' '}
                <span className="tabular-nums">
                  {sessionDate} at {sessionTime}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !isStep2Complete}
              className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#D6A84B] hover:bg-[#C39538] disabled:opacity-50 text-[#292929] text-[14px] font-semibold rounded-lg shadow-xs transition-colors min-h-[44px] whitespace-nowrap shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Attendance...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Attendance</span>
                </>
              )}
            </button>
          </div>

          {!isStep2Complete && (
            <p className="mt-3 text-[12px] font-normal text-[#5C5552]">
              Capture or upload a classroom photograph in Step 2 above to enable Analyze Attendance.
            </p>
          )}

          {analysisError && (
            <div
              role="alert"
              className="mt-4 p-3 text-[12px] font-normal text-red-700 bg-red-50 border border-red-200 rounded-lg"
            >
              {analysisError}
            </div>
          )}
        </section>
      )}

      {/* STEP 4 – ATTENDANCE DETAILS (Shown ONLY after attendance processing completes) */}
      {activeSession && (
        <div className="space-y-6">
          <div className="uni-card p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F0EAE0]">
              <div>
                <div className="text-[16px] font-medium text-[#681C2D]">
                  Step 4 · Attendance Details
                </div>
                <h2 className="font-display text-[22px] font-semibold text-[#292929] mt-0.5">
                  Processed Attendance Results
                </h2>
                <p className="text-[12px] font-normal text-[#5C5552] mt-1 tabular-nums">
                  {activeSession.academicYear} · {activeSession.classCode} ·{' '}
                  {activeSession.subjectName}
                  {activeSession.topicName ? ` · Topic: ${activeSession.topicName}` : ''} ·{' '}
                  {activeSession.date} · {activeSession.startTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onProceedToReview(activeSession.id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D6A84B] hover:bg-[#C39538] text-[#292929] text-[14px] font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Proceed to {editWindowMinutes}-Min Attendance Review</span>
              </button>
            </div>

            {/* Warnings if verification is required */}
            {hasAnyWarning ? (
              <div
                role="region"
                aria-label="Attendance verification warnings"
                className="bg-amber-50 border border-amber-300 rounded-xl p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-amber-950">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                    <h3 className="font-display text-[18px] font-semibold">
                      Verification Warnings Detected — Manual Check Recommended
                    </h3>
                  </div>
                  <span className="text-[12px] font-normal text-amber-800">
                    {editWindowMinutes}-Minute Review Window Active
                  </span>
                </div>

                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-amber-950">
                  {hasLowConfidence && (
                    <li className="p-3 bg-white/90 border border-amber-200 rounded-lg">
                      <span className="text-[14px] font-medium block">
                        Low Confidence Score ({activeSession.averageConfidence.toFixed(1)}% &lt;{' '}
                        {threshold.toFixed(1)}%)
                      </span>
                      <span className="text-[12px] font-normal text-amber-800">
                        Rear-row illumination reduced match certainty. Use Row-Wise Photo Upload below to boost confidence.
                      </span>
                    </li>
                  )}
                  {activeSession.warnings.unknownFacesCount > 0 && (
                    <li className="p-3 bg-white/90 border border-amber-200 rounded-lg">
                      <span className="text-[14px] font-medium block">
                        {activeSession.warnings.unknownFacesCount} Unidentified Face(s) Detected
                      </span>
                      <span className="text-[12px] font-normal text-amber-800">
                        Inspect the Unknown Faces tab below to assign to an absent student or dismiss as a visitor.
                      </span>
                    </li>
                  )}
                  {activeSession.warnings.duplicateMatches.length > 0 && (
                    <li className="p-3 bg-white/90 border border-amber-200 rounded-lg">
                      <span className="text-[14px] font-medium block">
                        Duplicate Identity Match ({activeSession.warnings.duplicateMatches.length})
                      </span>
                      <span className="text-[12px] font-normal text-amber-800">
                        Flagged: {activeSession.warnings.duplicateMatches.join(', ')}
                      </span>
                    </li>
                  )}
                  {activeSession.warnings.headcountMismatch && (
                    <li className="p-3 bg-white/90 border border-amber-200 rounded-lg">
                      <span className="text-[14px] font-medium block">
                        Headcount Mismatch Detected
                      </span>
                      <span className="text-[12px] font-normal text-amber-800 tabular-nums">
                        Detected {activeSession.warnings.headcountMismatch.detectedFaces} faces in frame vs{' '}
                        {activeSession.presentCount} matched students ({activeSession.enrolledCount} enrolled).
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-emerald-950">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-[14px] font-normal">
                    All checks passed — Confidence {activeSession.averageConfidence.toFixed(1)}% (≥
                    {threshold}%) with zero headcount or duplicate warnings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRowPanelManual((prev) => !prev)}
                  className="text-[14px] font-semibold text-emerald-800 hover:underline whitespace-nowrap"
                >
                  {showRowPanelManual ? 'Hide Row Assist' : 'Optional Row-Wise Upload'}
                </button>
              </div>
            )}

            {/* Key Statistics: Total Enrolled, Detected Faces, Confidence, Present, Absent, Unknown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="p-4 bg-[#FAF7F0] border border-[#E7DFCE] rounded-xl">
                <div className="text-[12px] font-normal text-[#5C5552]">Total Enrolled</div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#292929] tabular-nums">
                  {activeSession.enrolledCount}
                </div>
              </div>

              <div className="p-4 bg-[#FAF7F0] border border-[#E7DFCE] rounded-xl">
                <div className="text-[12px] font-normal text-[#5C5552] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#681C2D]" />
                  <span>Detected Faces</span>
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#292929] tabular-nums">
                  {activeSession.detectedFaceCount}
                </div>
              </div>

              <div className="p-4 bg-[#FAF7F0] border border-[#E7DFCE] rounded-xl">
                <div className="text-[12px] font-normal text-[#5C5552]">Confidence Score</div>
                <div
                  className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
                    hasLowConfidence ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {activeSession.averageConfidence.toFixed(1)}%
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div className="text-[12px] font-normal text-emerald-800 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Present Students</span>
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                  {activeSession.presentCount}
                </div>
              </div>

              <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl">
                <div className="text-[12px] font-normal text-red-800 flex items-center gap-1">
                  <UserX className="w-3.5 h-3.5 text-red-700" />
                  <span>Absent Students</span>
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">
                  {activeSession.absentCount}
                </div>
              </div>

              <div className="p-4 bg-[#FAF7F0] border border-[#E7DFCE] rounded-xl">
                <div className="text-[12px] font-normal text-[#5C5552]">Unknown Faces</div>
                <div
                  className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
                    activeSession.unknownCount > 0 ? 'text-amber-700' : 'text-[#292929]'
                  }`}
                >
                  {activeSession.unknownCount}
                </div>
              </div>
            </div>

            {/* Side-by-Side Present & Absent Student Lists (Names + Roll Numbers) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
              {/* Present Students List */}
              <div className="border border-emerald-200 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-emerald-50/70 border-b border-emerald-200 flex items-center justify-between">
                  <h3 className="font-display text-[18px] font-semibold text-emerald-950 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    <span>Present Students ({presentStudents.length})</span>
                  </h3>
                  <span className="text-[12px] font-normal text-emerald-800">
                    Name &amp; Roll No.
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#F0EAE0]">
                  {presentStudents.map((stu) => (
                    <div
                      key={stu.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 text-[14px] font-normal"
                    >
                      <div className="min-w-0">
                        <span className="text-[#292929] block truncate">{stu.name}</span>
                        <span className="font-mono text-[12px] text-[#5C5552] tabular-nums">
                          {stu.rollNumber}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-[12px] tabular-nums shrink-0 ${
                          (stu.confidence ?? 100) < threshold ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {stu.confidence !== null ? `${stu.confidence.toFixed(1)}%` : 'Verified'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Absent Students List */}
              <div className="border border-red-200 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-red-50/70 border-b border-red-200 flex items-center justify-between">
                  <h3 className="font-display text-[18px] font-semibold text-red-950 flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-700" />
                    <span>Absent Students ({absentStudents.length})</span>
                  </h3>
                  <span className="text-[12px] font-normal text-red-800">
                    Name &amp; Roll No.
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#F0EAE0]">
                  {absentStudents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[14px] font-normal text-[#5C5552]">
                      All enrolled students are marked present.
                    </div>
                  ) : (
                    absentStudents.map((stu) => (
                      <div
                        key={stu.id}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 text-[14px] font-normal"
                      >
                        <div className="min-w-0">
                          <span className="text-[#292929] block truncate">{stu.name}</span>
                          <span className="font-mono text-[12px] text-[#5C5552] tabular-nums">
                            {stu.rollNumber}
                          </span>
                        </div>
                        <span className="text-[12px] font-normal text-red-700 shrink-0">
                          Absent · {stu.rowLabel || 'Roster'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row-Wise Photo Upload (Low-Confidence Assist) */}
          {shouldShowRowUpload && (
            <section className="uni-card border-[#D6A84B]/60 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FAF7F0] border border-[#D6A84B]/60 flex items-center justify-center text-[#681C2D] shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-[18px] font-semibold text-[#292929]">
                      Row-Wise Photo Upload (Low-Confidence Assist)
                    </h3>
                    <p className="text-[12px] font-normal text-[#5C5552] mt-0.5 leading-relaxed">
                      Capture or upload a focused photograph of a specific bench row to elevate recognition confidence above {threshold}%.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleRowPhoto}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#681C2D] bg-[#FAF7F0] hover:bg-[#481321] hover:text-white border border-[#D6A84B]/60 hover:border-[#481321] rounded-lg transition-colors whitespace-nowrap"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Load Sample Row {selectedRowNumber} Photo</span>
                </button>
              </div>

              {/* Hidden File Input for Upload Row Photo Button */}
              <input
                ref={rowUploadInputRef}
                id="row-photo-input"
                type="file"
                accept="image/*"
                onChange={handleRowFileChange}
                className="sr-only"
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-5 space-y-3.5">
                  <div>
                    <label
                      htmlFor="row-select"
                      className="block text-[14px] font-medium text-[#292929] mb-1.5"
                    >
                      Target Classroom Row
                    </label>
                    <select
                      id="row-select"
                      value={selectedRowNumber}
                      onChange={(e) => setSelectedRowNumber(Number(e.target.value))}
                      className="uni-input w-full px-3 py-2 text-[14px] min-h-[44px]"
                    >
                      <option value={1}>Row 1 (Front Benches)</option>
                      <option value={2}>Row 2 (Middle Benches)</option>
                      <option value={3}>Row 3 (Rear Benches)</option>
                    </select>
                  </div>

                  {/* Two Separate Side-by-Side Functional Row Photo Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleOpenRowCamera}
                      disabled={isStartingRowCamera}
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#681C2D] hover:bg-[#481321] disabled:opacity-60 text-white text-[14px] font-semibold rounded-lg shadow-xs transition-colors min-h-[44px] whitespace-nowrap"
                    >
                      <Camera className="w-4 h-4 text-[#D6A84B] shrink-0" />
                      <span>
                        {isStartingRowCamera ? 'Opening Camera...' : 'Capture Row Photo'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerRowUploadPicker}
                      className="group inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#FAF7F0] hover:bg-[#481321] text-[#681C2D] hover:text-white border border-[#D6A84B]/60 hover:border-[#481321] text-[14px] font-semibold rounded-lg transition-colors min-h-[44px] whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4 text-[#681C2D] group-hover:text-[#D6A84B] shrink-0 transition-colors" />
                      <span>Upload Row Photo</span>
                    </button>
                  </div>

                  {rowCameraError && (
                    <div
                      role="alert"
                      className="p-3 text-[12px] font-normal text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-2"
                    >
                      <span>{rowCameraError}</span>
                      <button
                        type="button"
                        onClick={() => setRowCameraError(null)}
                        aria-label="Dismiss row camera error"
                        className="text-red-500 hover:text-red-800 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUploadRowVerification}
                    disabled={!rowPreviewUrl || isVerifyingRow}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#D6A84B] hover:bg-[#C39538] disabled:opacity-50 text-[#292929] text-[14px] font-semibold rounded-lg shadow-xs transition-colors min-h-[44px]"
                  >
                    {isVerifyingRow ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Re-verifying {selectedRowName}...</span>
                      </>
                    ) : (
                      <span>Upload &amp; Re-Verify Row {selectedRowNumber}</span>
                    )}
                  </button>
                </div>

                <div className="lg:col-span-7">
                  {isRowCameraOpen ? (
                    <div className="space-y-3">
                      <div className="text-[14px] font-medium text-[#292929]">
                        Capturing for: {selectedRowName}
                      </div>
                      <div className="relative rounded-xl overflow-hidden border border-[#681C2D]/40 bg-[#481321] aspect-video max-h-60">
                        <video
                          ref={rowVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[12px] font-normal text-[#5C5552]">
                          Live row camera preview active
                        </span>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleCancelRowCamera}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#5C5552] bg-white hover:bg-[#FAF7F0] border border-[#D6CFC2] rounded-lg transition-colors min-h-[40px]"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleTakeRowPhoto}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors min-h-[40px]"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Take Photo</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : rowCapturedPreviewUrl ? (
                    <div className="space-y-3">
                      <div className="text-[14px] font-medium text-[#292929]">
                        Captured for: {selectedRowName}
                      </div>
                      <div className="relative rounded-xl overflow-hidden border border-[#D6A84B] bg-[#481321] aspect-video max-h-60">
                        <img
                          src={rowCapturedPreviewUrl}
                          alt={`Captured ${selectedRowName} preview`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[12px] font-normal text-[#681C2D]">
                          Row photo captured — confirm to enable verification
                        </span>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleRetakeRowPhoto}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#292929] bg-white hover:bg-[#FAF7F0] border border-[#D6CFC2] rounded-lg transition-colors min-h-[40px]"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Retake</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleUseCapturedRowPhoto}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors min-h-[40px]"
                          >
                            <Check className="w-4 h-4" />
                            <span>Use Photo</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : rowPreviewUrl ? (
                    <div className="space-y-2.5">
                      <div className="text-[14px] font-medium text-[#292929]">
                        Selected Classroom Row: {selectedRowName}
                      </div>
                      <div className="rounded-xl overflow-hidden border border-[#E7DFCE] aspect-video max-h-60 bg-[#481321]">
                        <img
                          src={rowPreviewUrl}
                          alt={`${selectedRowName} preview`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-normal text-[#5C5552]">
                        <span className="font-mono truncate max-w-xs">{rowFileName}</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleTriggerRowUploadPicker}
                            className="text-[14px] font-semibold text-[#681C2D] hover:text-[#481321]"
                          >
                            Replace photo
                          </button>
                          <button
                            type="button"
                            onClick={handleClearRowPhoto}
                            className="text-[14px] font-semibold text-[#5C5552] hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 border-2 border-dashed border-[#D6CFC2] rounded-xl bg-[#FAF7F0] flex flex-col items-center justify-center text-center p-5">
                      <div className="text-[14px] font-medium text-[#292929]">
                        No row-level photo selected for {selectedRowName}
                      </div>
                      <p className="text-[12px] font-normal text-[#5C5552] mt-1 max-w-sm leading-relaxed">
                        Use Capture Row Photo or Upload Row Photo, or click &ldquo;Load Sample Row {selectedRowNumber} Photo&rdquo; to preview and boost rear-row confidence.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {activeSession.rowUploads.length > 0 && (
                <div className="pt-3 border-t border-[#F0EAE0] text-[12px] font-normal text-[#5C5552] space-y-1">
                  <div className="text-[14px] font-medium text-[#292929]">
                    Completed Row Verifications:
                  </div>
                  {activeSession.rowUploads.map((log, i) => (
                    <div key={`${log.rowNumber}-${i}`} className="tabular-nums">
                      • {log.rowLabel} ({log.fileName}) — Improved {log.facesImproved} match(es) · Row avg {log.averageConfidence}%
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Detailed Attendance Results Table & Unknown Faces Resolution */}
          <section className="uni-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7DFCE] flex flex-wrap items-center justify-between gap-4">
              <div
                className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg overflow-x-auto"
                role="tablist"
              >
                {(
                  [
                    { id: 'all', label: `All (${activeSession.students.length})` },
                    { id: 'present', label: `Present (${activeSession.presentCount})` },
                    { id: 'absent', label: `Absent (${activeSession.absentCount})` },
                    { id: 'unknown', label: `Unknown Faces (${activeSession.unknownCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={resultTab === tab.id}
                    onClick={() => setResultTab(tab.id)}
                    className={`px-3 py-1.5 text-[14px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      resultTab === tab.id
                        ? 'bg-[#681C2D] text-white shadow-xs'
                        : 'text-[#5C5552] hover:text-[#481321]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {resultTab === 'unknown' ? (
              <div className="p-6">
                {activeSession.unknownFaces.length === 0 ? (
                  <div className="text-center py-8 text-[14px] font-normal text-[#5C5552]">
                    No unidentified faces detected in this session.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSession.unknownFaces.map((unk) => (
                      <div
                        key={unk.id}
                        className="p-4 border border-[#E7DFCE] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF7F0]"
                      >
                        <div>
                          <div className="text-[14px] font-medium text-[#292929]">
                            {unk.regionLabel}
                          </div>
                          <div className="text-[12px] font-normal text-[#5C5552] mt-0.5 tabular-nums">
                            {unk.rowLabel} · Match confidence: {unk.confidence}% · Status:{' '}
                            <span className="font-medium text-[#292929]">
                              {unk.resolutionStatus === 'unresolved'
                                ? 'Needs review'
                                : unk.resolutionStatus === 'assigned'
                                  ? `Assigned to ${unk.assignedStudentName}`
                                  : 'Dismissed'}
                            </span>
                          </div>
                        </div>

                        {unk.resolutionStatus === 'unresolved' && (
                          <div className="flex flex-wrap items-center gap-2">
                            {absentStudents.length > 0 && (
                              <select
                                aria-label="Assign unknown face to absent student"
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleResolveUnknown(unk.id, e.target.value);
                                  }
                                }}
                                className="uni-input px-3 py-1.5 text-[14px]"
                              >
                                <option value="" disabled>
                                  Assign to absent student...
                                </option>
                                {absentStudents.map((stu) => (
                                  <option key={stu.id} value={stu.id}>
                                    {stu.rollNumber} · {stu.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => handleResolveUnknown(unk.id)}
                              className="px-3 py-1.5 text-[14px] font-semibold text-[#681C2D] bg-white hover:bg-[#481321] hover:text-white border border-[#D6CFC2] hover:border-[#481321] rounded-lg transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-medium text-[#292929]">
                      <th className="py-3 px-6">Roll Number</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Seat Row</th>
                      <th className="py-3 px-4 text-right">Confidence</th>
                      <th className="py-3 px-6 text-right">Status &amp; Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
                    {filteredStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-[#FAF7F0]/80 transition-colors">
                        <td className="py-3 px-6 font-mono text-[14px] font-normal text-[#5C5552] tabular-nums whitespace-nowrap">
                          {stu.rollNumber}
                        </td>
                        <td className="py-3 px-4 text-[14px] font-medium text-[#292929]">
                          {stu.name}
                        </td>
                        <td className="py-3 px-4 text-[14px] font-normal text-[#5C5552] whitespace-nowrap">
                          {stu.rowLabel || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[14px] font-normal tabular-nums whitespace-nowrap">
                          {stu.confidence !== null ? (
                            <span
                              className={
                                stu.confidence < threshold ? 'text-amber-700' : 'text-[#292929]'
                              }
                            >
                              {stu.confidence.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[#8C7F78]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2 text-[14px] font-normal">
                            {stu.matchWarning === 'duplicate_match' && (
                              <span className="text-amber-700">Duplicate Match ·</span>
                            )}
                            {stu.matchWarning === 'low_confidence' && (
                              <span className="text-amber-700">Low Confidence ·</span>
                            )}
                            <span
                              className={
                                stu.status === 'present' ? 'text-emerald-700' : 'text-red-700'
                              }
                            >
                              {stu.status === 'present' ? 'Present' : 'Absent'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
