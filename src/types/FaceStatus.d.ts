export const FaceStatus = {
    FACE_IS_SIMILAR: "FACE_IS_SIMILAR",
    FACE_IS_NOT_SIMILAR: "FACE_IS_NOT_SIMILAR",
    ALIGN_FACE_IN_FRAME: "ALIGN_FACE_IN_FRAME",
    NO_FACE_DETECTED: "NO_FACE_DETECTED",
} as const;

export type FaceStatus =
    typeof FaceStatus[keyof typeof FaceStatus];
