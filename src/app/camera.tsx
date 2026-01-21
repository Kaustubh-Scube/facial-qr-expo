import { Skia } from "@shopify/react-native-skia";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import {
    BoxedInspireFace,
    CameraRotation,
    DetectMode,
    InspireFace,
    Session,
} from "react-native-nitro-inspire-face";
import {
    Camera,
    DrawableFrame,
    Templates,
    useCameraDevice,
    useCameraFormat,
    useSkiaFrameProcessor,
} from "react-native-vision-camera";
import { useRunOnJS } from "react-native-worklets-core";
import { useResizePlugin } from "vision-camera-resize-plugin";

//Launch the model package
InspireFace.launch("Pikachu");

export default function Example() {
    let device = useCameraDevice("front");
    const camera = useRef<Camera>(null);
    const { resize } = useResizePlugin();

    const format = useCameraFormat(device, Templates.FrameProcessing);

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("blue"));

    let session: Session

    useEffect(() => {
        session = InspireFace.createSession(
            {
                enableRecognition: true,
                enableFaceQuality: true,
                enableFaceAttribute: true,
                enableInteractionLiveness: true,
                enableLiveness: true,
                enableMaskDetect: true,
            },
            DetectMode.ALWAYS_DETECT,
            10,
            -1,
            -1
        );
        session.setTrackPreviewSize(320);
        session.setFaceDetectThreshold(0.5);
    }, []);

    const runInspireFace = (resizedFrame: Uint8Array<ArrayBufferLike>, size: number, scaleX: number, cropOffset: number, frame: DrawableFrame) => {
        if (!resizedFrame) return;

        // Unbox InspireFace instance for frame processor
        const unboxedInspireFace = BoxedInspireFace.unbox();

        // Create image bitmap from frame buffer
        const bitmap = unboxedInspireFace.createImageBitmapFromBuffer(
            resizedFrame.buffer as ArrayBuffer,
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
        const faces = session.executeFaceTrack(imageStream);

        // Draw facial landmarks for each detected face
        for (let i = 0; i < faces.length; i++) {
            const lmk = unboxedInspireFace.getFaceDenseLandmarkFromFaceToken(
                faces[i].token
            );
            const path = Skia.Path.Make();

            // Draw landmark points
            lmk.forEach((point) => {
                path.addCircle(point.y * scaleX + cropOffset, point.x * scaleX, 3);
            });

            // Draw landmarks to canvas
            frame.drawPath(path, paint);
        }

        // Clean up resources
        imageStream.dispose();
        bitmap.dispose();
    }

    const runOnDetection = useRunOnJS(({
        resizedFrame,
        size,
        cropOffset,
        scaleX,
        frame,
    }: {
        resizedFrame: Uint8Array<ArrayBufferLike>,
        size: number,
        scaleX: number,
        cropOffset: number,
        frame: DrawableFrame
    }) => {
        runInspireFace(resizedFrame, size, scaleX, cropOffset, frame)
    }, []);

    const frameProcessor = useSkiaFrameProcessor((frame) => {
        "worklet";

        // Draw the frame to the canvas
        frame.render();

        const size = 320;
        const frameWidth = frame.height; // 720
        const scaleX = frameWidth / size; // Scale based on processed width
        const cropOffset = (frame.width - frame.height) / 2; // Adjust for cropping

        // Resize frame for processing
        const resized = resize(frame, {
            scale: {
                width: size,
                height: size,
            },
            rotation: "90deg",
            pixelFormat: "bgr",
            dataType: "uint8",
            mirror: true,
        });

        runOnDetection({
            resizedFrame: resized,
            size,
            cropOffset,
            scaleX,
            frame,
        });

    }, []);

    //The CameraPermissionGuard is just a wrapper to check for permissions
    return (
        <View style={{ flex: 1 }}>
            <Camera
                ref={camera}
                style={{ flex: 1 }}
                device={device!}
                isActive={true}
                format={format}
                frameProcessor={frameProcessor}
            />
        </View>
    );
}