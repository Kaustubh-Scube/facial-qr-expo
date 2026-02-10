import { FaceAlignOverlay } from '@/components/FaceAlignOverlay';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BoxedInspireFace, CameraRotation, DetectMode, InspireFace } from 'react-native-nitro-inspire-face';
import { NitroModules } from 'react-native-nitro-modules';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useRunOnJS, useSharedValue } from 'react-native-worklets-core';
import { useResizePlugin } from "vision-camera-resize-plugin";

type Props = {}

InspireFace.launch('Pikachu');
InspireFace.setAppleCoreMLInferenceMode(2);

const FaceScannerScreen = ({ }: Props) => {

    const { scannerValue } = useLocalSearchParams<{ scannerValue: string }>();
    const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
    const [isPersonSimilar, setIsPersonSimilar] = useState<string>("NO_FACE_DETECTED");

    const device = useCameraDevice("front");
    const isFrameProcessorActive = useSharedValue(true);
    const isPersonSame = useSharedValue("");

    const { resize } = useResizePlugin();

    // Enable while creating a production build
    /* useEffect(() => {
        return () => {
            InspireFace.terminate();
            session.current.unbox().dispose();
        };
    }, []); */

    const session = useRef(
        NitroModules.box(
            InspireFace.createSession(
                {
                    enableRecognition: true,
                    enableFaceQuality: true,
                    enableFaceAttribute: true,
                    enableInteractionLiveness: true,
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
    }, [])

    const frameProcessor = useFrameProcessor((frame) => {
        "worklet";

        if (!session.current || !isFrameProcessorActive.value) return;
        const size = 320;
        const frameWidth = frame.height; // 720

        // Resize frame for processing
        const resized = resize(frame, {
            scale: {
                width: size,
                height: size,
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
            size,
            size,
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
            handleIsFaceSimilar("NO_FACE_DETECTED");
        }

        if (faces.length > 1) {
            isFrameProcessorActive.value = false;
            handleMultipleFaces();
            return;
        };

        const recommendedCosine = unboxedInspireFace.getRecommendedCosineThreshold();

        const currentFace = faces[0]

        if (!currentFace) return;

        // const rgbLiveness = unboxedSession.getRGBLivenessConfidence();
        // const faceQualtiyConfidence = unboxedSession.getFaceQualityConfidence();

        const currentFaceFeature = unboxedSession.extractFaceFeature(
            imageStream,
            currentFace.token
        );

        // const currentFaceBase64 = unboxedInspireFace.toBase64(currentFaceFeature);
        const currentBioQrBuffer = unboxedInspireFace.fromBase64(scannerValue)

        const faceCompareRes = unboxedInspireFace.faceComparison(currentFaceFeature, currentBioQrBuffer);

        if (faceCompareRes > recommendedCosine) {
            handleIsFaceSimilar("FACE_IS_SIMILAR")
        } else {
            // isPersonSame.value = "FACE_IS_NOT_SIMILAR"
            handleIsFaceSimilar("FACE_IS_NOT_SIMILAR")
        }

        // console.log(rgbLiveness[0], "LIVENSESS");
        // console.log(faceQualtiyConfidence, "FACE_QUALITY")

    }, []);

    console.log(scannerValue, "SCANNER_VALUES");

    return (
        <View style={{ flex: 1, position: "relative" }}>
            <Camera
                isActive={isCameraActive}
                style={StyleSheet.absoluteFill}
                device={device!}
                frameProcessor={frameProcessor}
            />
            <View style={{
                position: "absolute",
                top: 50,
                width: "100%",
                height: 20,
                backgroundColor: '#FFF',
                zIndex: 999
            }}>
                <Text style={{ textAlign: "center" }}>
                    {isPersonSimilar}
                </Text>
            </View>
            <FaceAlignOverlay />
        </View>
    )
}

export default FaceScannerScreen