import { createSkiaImageFromData } from '@/utils/SkiaUtils';
import {
    Canvas,
    Image,
    SkData,
    Skia,
    SkImage,
} from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useSharedValue } from 'react-native-reanimated';
import {
    Camera,
    runAsync,
    useCameraDevice,
    useCameraPermission,
    useFrameProcessor
} from 'react-native-vision-camera';
import {
    Face,
    FrameFaceDetectionOptions,
    useFaceDetector
} from 'react-native-vision-camera-face-detector';
import { useRunOnJS, Worklets } from 'react-native-worklets-core';
import { Options, useResizePlugin } from 'vision-camera-resize-plugin';

type PixelFormat = Options<'uint8'>['pixelFormat'];

const WIDTH = 112;
const HEIGHT = 112;
const TARGET_TYPE = 'uint8' as const;
const TARGET_FORMAT: PixelFormat = 'rgba';

export default function App() {

    const [detectedFaces, setDetectedFaces] = React.useState<Face>();
    const hasDetectedFaceRef = React.useRef(false)
    const faceDetectionOptions = React.useRef<FrameFaceDetectionOptions>({
        trackingEnabled: true,
        landmarkMode: "all",
        // detection options
    }).current;

    const model = useTensorflowModel(require("../assets/models/mobile_face_net.tflite"));
    const actualModel = model.state === "loaded" ? model.model : undefined;

    const permission = useCameraPermission();
    const device = useCameraDevice('front');
    const previewImage = useSharedValue<SkImage | null>(null);

    React.useEffect(() => {
        permission.requestPermission();
    }, [permission]);

    const plugin = useResizePlugin();

    const {
        detectFaces,
        stopListeners
    } = useFaceDetector(faceDetectionOptions)

    React.useEffect(() => {
        if (!device) {
            // you must call `stopListeners` when `Camera` component is unmounted
            stopListeners()
            return
        }

        (async () => {
            const status = await Camera.requestCameraPermission()
            console.log({ status })
        })()
    }, [device])

    React.useEffect(() => {
        return () => {
            // you must call `stopListeners` when current component is unmounted
            stopListeners()
        }
    }, [])

    const updatePreviewImageFromData = useRunOnJS(
        (data: SkData, pixelFormat: PixelFormat) => {
            const image = createSkiaImageFromData(data, WIDTH, HEIGHT, pixelFormat);
            previewImage.value?.dispose();
            previewImage.value = image;
            data.dispose();
        },
        []
    );

    const handleDetectedFaces = Worklets.createRunOnJS((faces: Face[]) => {
        if (faces.length === 0) return

        setDetectedFaces(faces[0])
        hasDetectedFaceRef.current = true
    });

    const frameProcessor = useFrameProcessor(
        (frame) => {
            'worklet';

            const start = performance.now();

            if (!hasDetectedFaceRef.current) {
                runAsync(frame, () => {
                    'worklet';

                    const faces = detectFaces(frame)
                    // ... chain some asynchronous frame processor
                    // ... do something asynchronously with frame
                    handleDetectedFaces(faces)
                })
                // ... chain frame processors
                // ... do something with frame
            };

            if (!detectedFaces) return;

            const resized = plugin.resize(frame, {
                crop: {
                    x: detectedFaces.bounds.x,
                    y: detectedFaces.bounds.y,
                    width: detectedFaces.bounds.width,
                    height: detectedFaces.bounds.height,
                },
                scale: {
                    width: 112,
                    height: 112,
                },
                pixelFormat: 'rgb',
                dataType: 'float32',
                rotation: "90deg",
                mirror: false,
            });

            const previewResized = plugin.resize(frame, {
                crop: {
                    x: detectedFaces.bounds.x,
                    y: detectedFaces.bounds.y,
                    width: detectedFaces.bounds.width,
                    height: detectedFaces.bounds.height,
                },
                scale: {
                    width: WIDTH,
                    height: HEIGHT,
                },
                dataType: TARGET_TYPE,
                pixelFormat: TARGET_FORMAT,
                rotation: "90deg",
                mirror: false,
            });

            if (actualModel) {
                const result = actualModel.runSync([resized]);

                console.log(result, "RESULT");
            }

            const data = Skia.Data.fromBytes(previewResized);
            updatePreviewImageFromData(data, TARGET_FORMAT);
            const end = performance.now();

            console.log(
                `Resized ${frame.width}x${frame.height} into 100x100 frame (${previewResized.length
                }) in ${(end - start).toFixed(2)}ms`
            );
        },
        [updatePreviewImageFromData, handleDetectedFaces]
    );

    return (
        <View style={styles.container}>
            {permission.hasPermission && device != null && (
                <Camera
                    device={device}
                    enableFpsGraph
                    style={StyleSheet.absoluteFill}
                    isActive={true}
                    pixelFormat="yuv"
                    frameProcessor={frameProcessor}
                />
            )}
            <View style={styles.canvasWrapper}>
                <Canvas style={{ width: WIDTH, height: HEIGHT }}>
                    <Image
                        image={previewImage}
                        x={0}
                        y={0}
                        width={WIDTH}
                        height={HEIGHT}
                        fit="cover"
                    />
                </Canvas>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    box: {
        width: 60,
        height: 60,
        marginVertical: 20,
    },
    canvasWrapper: {
        position: 'absolute',
        bottom: 80,
        left: 20,
    },
});