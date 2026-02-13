import { FaceAlignOverlay } from '@/components/FaceAlignOverlay';
import { FACE_HEIGHT, FACE_WIDTH, MASK } from '@/libs/constants';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Text, View } from 'react-native';
import { BoxedInspireFace, CameraRotation, DetectMode, FaceEulerAngle, FaceRect, InspireFace } from 'react-native-nitro-inspire-face';
import { NitroModules } from 'react-native-nitro-modules';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useRunOnJS, useSharedValue } from 'react-native-worklets-core';
import { useResizePlugin } from "vision-camera-resize-plugin";

type Props = {}

InspireFace.launch('Pikachu');
InspireFace.setAppleCoreMLInferenceMode(2);

const { width, height } = Dimensions.get('window');

const PREVIEW_SIZE = 320;

const FaceScannerScreen = ({ }: Props) => {

    const { scannerValue } = useLocalSearchParams<{ scannerValue: string }>();
    const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
    const [isPersonSimilar, setIsPersonSimilar] = useState<string>("NO_FACE_DETECTED ❌");

    const device = useCameraDevice("front");
    // const format = useCameraFormat(device, Templates.Video60Fps);
    const isFrameProcessorActive = useSharedValue(true);

    const { resize } = useResizePlugin();

    // Enable while creating a production build
    useEffect(() => {
        return () => {
            // InspireFace.terminate();
            // session.current.unbox().dispose();
        };
    }, []);

    const session = useRef(
        NitroModules.box(
            InspireFace.createSession(
                {
                    enableRecognition: true,
                    enableFaceQuality: true,
                    enableFaceAttribute: true,
                    enableInteractionLiveness: false,
                    enableLiveness: true,
                    enableMaskDetect: true,
                },
                DetectMode.LIGHT_TRACK,
                1,
                -1,
                -1
            )
        )
    );
    session.current.unbox().setTrackPreviewSize(320);
    session.current.unbox().setFaceDetectThreshold(0.5);

    const handleMultipleFaces = useRunOnJS(() => {
        Alert.alert(
            'Multiple Faces Detected',
            'Please scan the face of only one single person.',
            [{
                text: 'OK',
                onPress: () => {
                    router.canGoBack() ? router.back() : undefined
                }
            }],
            { cancelable: false }
        );
    }, []);

    const handleIsFaceSimilar = useRunOnJS((value: string) => {
        setIsPersonSimilar(value)
    }, []);

    const mapFaceToScreen = (rect: FaceRect) => {
        "worklet";

        const scaleX = width / PREVIEW_SIZE;
        const scaleY = height / PREVIEW_SIZE;

        return {
            width: rect.width * scaleX,
            height: rect.height * scaleY,
            centerX: (rect.x + rect.width / 2) * scaleX,
            centerY: (rect.y + rect.height / 2) * scaleY,
        };
    };

    const isInsideOval = (x: number, y: number) => {
        "worklet";

        const a = FACE_WIDTH / 2;
        const b = FACE_HEIGHT / 2;

        const value =
            Math.pow(x - MASK.centerX, 2) / Math.pow(a, 2) +
            Math.pow(y - MASK.centerY, 2) / Math.pow(b, 2);

        return value <= 1;
    };

    const isFaceSizeValid = (w: number, h: number) => {
        "worklet";

        const widthRatio = w / FACE_WIDTH;
        const heightRatio = h / FACE_HEIGHT;

        return (
            widthRatio > 0.45 &&
            widthRatio < 0.75 &&
            heightRatio > 0.45 &&
            heightRatio < 0.8
        );
    };

    const isFaceStraight = (angle: FaceEulerAngle) => {
        "worklet";

        return (
            Math.abs(angle.yaw) < 12 &&
            Math.abs(angle.pitch) < 10 &&
            Math.abs(angle.roll) < 10
        );
    };

    const frameProcessor = useFrameProcessor((frame) => {
        "worklet";

        if (!session.current || !isFrameProcessorActive.value) return;

        // Resize frame for processing
        const resized = resize(frame, {
            scale: {
                width: PREVIEW_SIZE,
                height: PREVIEW_SIZE,
            },
            rotation: "90deg",
            pixelFormat: "bgr",
            dataType: "uint8",
            mirror: false,
        });

        // Unbox InspireFace instance for frame processor
        const unboxedInspireFace = BoxedInspireFace.unbox();

        // Create image bitmap from frame buffer
        const bitmap = unboxedInspireFace.createImageBitmapFromBuffer(
            resized.buffer as ArrayBuffer,
            PREVIEW_SIZE,
            PREVIEW_SIZE,
            3
        );

        // Create image stream for face detection
        const imageStream = unboxedInspireFace.createImageStreamFromBitmap(
            bitmap,
            CameraRotation.ROTATION_0
        );

        // Unbox session and execute face detection
        const unboxedSession = session.current.unbox();
        const faces = unboxedSession.executeFaceTrack(imageStream);
        unboxedSession.multipleFacePipelineProcess(imageStream, faces, {
            enableFaceQuality: true,
            enableLiveness: true,
            enableMaskDetect: true,
            enableFaceAttribute: true,
            enableInteractionLiveness: false,
        });

        // console.log(faces[0].rect, "TOTAL_FACES")
        if (faces.length == 0) {
            handleIsFaceSimilar("NO_FACE_DETECTED ❌");
        }

        if (faces.length > 1) {
            isFrameProcessorActive.value = false;
            handleMultipleFaces();
            return;
        };

        const recommendedCosine = unboxedInspireFace.getRecommendedCosineThreshold();

        const currentFace = faces[0]

        if (!currentFace) return;

        const mapped = mapFaceToScreen(currentFace.rect);

        const aligned = isInsideOval(mapped.centerX, mapped.centerY) && isFaceStraight(currentFace.angle);

        if (!aligned) {
            handleIsFaceSimilar("ALIGN_FACE_IN_FRAME ⚠️");
            return;
        }

        // const rgbLiveness = unboxedSession.getRGBLivenessConfidence();
        // const faceQualtiyConfidence = unboxedSession.getFaceQualityConfidence();

        const currentFaceFeature = unboxedSession.extractFaceFeature(
            imageStream,
            currentFace.token
        );

        // const currentFaceBase64 = unboxedInspireFace.toBase64(currentFaceFeature);
        const currentBioQrBuffer = unboxedInspireFace.fromBase64(scannerValue)

        const faceCompareRes = unboxedInspireFace.faceComparison(currentFaceFeature, currentBioQrBuffer);

        console.log(faceCompareRes, "FACE_RES");

        if (faceCompareRes > recommendedCosine) {
            handleIsFaceSimilar("FACE_IS_SIMILAR ✅")
        } else {
            // isPersonSame.value = "FACE_IS_NOT_SIMILAR"
            handleIsFaceSimilar("FACE_IS_NOT_SIMILAR ❌")
        }

        // console.log(rgbLiveness[0], "LIVENSESS");
        // console.log(faceQualtiyConfidence, "FACE_QUALITY")
        imageStream.dispose();
        bitmap.dispose();
    }, []);

    return (
        <View style={{ flex: 1, position: "relative" }}>
            <Camera
                isActive
                style={{ flex: 1 }}
                device={device!}
                frameProcessor={frameProcessor}
                // format={format}
            />
            <View style={{
                position: "absolute",
                top: 50,
                width: "100%",
                height: 20,
                backgroundColor: '#FFF',
                zIndex: 999
            }}>
                <Text
                    style={{
                        textAlign: "center",
                        fontSize: 16,
                        fontWeight: "500",
                        color:
                            isPersonSimilar === "FACE_IS_SIMILAR"
                                ? "green"
                                : isPersonSimilar === "FACE_IS_NOT_SIMILAR"
                                    ? "red"
                                    : isPersonSimilar === "ALIGN_FACE_IN_FRAME"
                                        ? "gray"
                                        : isPersonSimilar === "NO_FACE_DETECTED"
                                            ? "black"
                                            : "black",
                    }}
                >
                    {isPersonSimilar}
                </Text>
            </View>
            <FaceAlignOverlay />
        </View>
    )
}

export default FaceScannerScreen