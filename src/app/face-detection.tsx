import React, {
    useEffect,
    useRef
} from 'react'
import {
    StyleSheet,
    Text,
    View
} from 'react-native'
import { Tensor, TensorflowModel, useTensorflowModel } from 'react-native-fast-tflite'
import {
    Camera,
    runAsync,
    useCameraDevice,
    useFrameProcessor
} from 'react-native-vision-camera'
import {
    Face,
    FrameFaceDetectionOptions,
    useFaceDetector
} from 'react-native-vision-camera-face-detector'
import { Worklets } from 'react-native-worklets-core'
import { useResizePlugin } from 'vision-camera-resize-plugin'

function tensorToString(tensor: Tensor): string {
    return `\n  - ${tensor.dataType} ${tensor.name}[${tensor.shape}]`
}
function modelToString(model: TensorflowModel): string {
    return (
        `TFLite Model (${model.delegate}):\n` +
        `- Inputs: ${model.inputs.map(tensorToString).join('')}\n` +
        `- Outputs: ${model.outputs.map(tensorToString).join('')}`
    )
}

export default function App() {

    const [detectedFaces, setDetectedFaces] = React.useState<Face>();
    const hasDetectedFaceRef = useRef(false)

    const faceDetectionOptions = useRef<FrameFaceDetectionOptions>({
        trackingEnabled: true,
        landmarkMode: "all",
        // detection options
    }).current

    const device = useCameraDevice('front');

    const model = useTensorflowModel(require('../assets/models/mobile_face_net.tflite'))
    const actualModel = model.state === 'loaded' ? model.model : undefined

    const {
        detectFaces,
        stopListeners
    } = useFaceDetector(faceDetectionOptions)

    const { resize } = useResizePlugin();

    React.useEffect(() => {
        if (actualModel == null) return
        console.log(`Model loaded! Shape:\n${modelToString(actualModel)}]`)
    }, [actualModel])

    useEffect(() => {
        return () => {
            // you must call `stopListeners` when current component is unmounted
            stopListeners()
        }
    }, [])

    useEffect(() => {
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

    const handleDetectedFaces = Worklets.createRunOnJS((faces: Face[]) => {
        if (faces.length === 0) return

        setDetectedFaces(faces[0])
        hasDetectedFaceRef.current = true
    });

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet'

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

        if (!actualModel || !detectedFaces) { return; };

        const resized = resize(frame, {
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
        })
        const result = actualModel.runSync([resized]);

        console.log(result, "RESULT_FACE")

    }, [handleDetectedFaces]);

    console.log(detectedFaces, "detectedFaces")

    return (
        <View style={{ flex: 1 }}>
            {!!device ? <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                frameProcessor={frameProcessor}
            /> : <Text>
                No Device
            </Text>}
        </View>
    )
}