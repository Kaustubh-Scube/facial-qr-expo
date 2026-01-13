import { DetectionOverlay } from '@/components/DetectionOverlay';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
    Tensor,
    TensorflowModel,
    useTensorflowModel
} from 'react-native-fast-tflite';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

type Props = {}

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

const CameraScreen = ({ }: Props) => {

    const [detections, setDetections] = React.useState<unknown[]>([])

    const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const device = useCameraDevice('back')

    // from https://www.kaggle.com/models/tensorflow/efficientdet/frameworks/tfLite
    const model = useTensorflowModel(require('../assets/models/efficientdet.tflite'))
    const actualModel = model.state === 'loaded' ? model.model : undefined

    const runOnDetections = useRunOnJS((workletDetections) => {
        setDetections(workletDetections)
    }, [])

    useEffect(() => {
        requestCameraPermission();
    }, []);

    React.useEffect(() => {
        if (actualModel == null) return
        console.log(`Model loaded! Shape:\n${modelToString(actualModel)}]`)
    }, [actualModel]);

    const { resize } = useResizePlugin();

    let lastSent = 0;
    const frameProcessor = useFrameProcessor(
        (frame) => {
            'worklet'
            if (actualModel == null) {
                // model is still loading...
                return
            };

            if (frame.timestamp - lastSent < 200) return
            lastSent = frame.timestamp

            console.log(`Running inference on ${frame}`)
            const resized = resize(frame, {
                scale: {
                    width: 320,
                    height: 320,
                },
                pixelFormat: 'rgb',
                dataType: 'uint8',
            })
            const result = actualModel.runSync([resized])

            const boxes = result[0]
            const scores = result[2]
            const count = result[3][0]

            const dets = []

            for (let i = 0; i < count; i++) {
                if (scores[i] < 0.5) continue

                dets.push({
                    xmin: boxes[i * 4 + 1],
                    ymin: boxes[i * 4 + 0],
                    xmax: boxes[i * 4 + 3],
                    ymax: boxes[i * 4 + 2],
                    score: scores[i],
                })
            }
            runOnDetections(dets)
            // console.log(result, "RESULT");
            // const num_detections = result[3]?.[0] ?? 0
            // console.log('Result: ' + num_detections)
        },
        [actualModel]
    )

    React.useEffect(() => {
        requestCameraPermission()
    }, [requestCameraPermission])

    console.log(`Model: ${model.state} (${model.model != null})`)

    if (!device || !hasCameraPermission) {
        return (
            <View>
                <Text>Allow Permission to camera from setting</Text>
            </View>
        )
    };

    return (
        <View style={styles.container}>
            {hasCameraPermission && device != null ? (
                <Camera
                    device={device}
                    style={StyleSheet.absoluteFill}
                    isActive={true}
                    frameProcessor={frameProcessor}
                    pixelFormat="yuv"
                />
            ) : (
                <Text>No Camera available.</Text>
            )}

            {/* 🔥 DRAW BOXES HERE */}
            <DetectionOverlay detections={detections as any[]} />

            {model.state === 'loading' && (
                <ActivityIndicator size="small" color="white" />
            )}

            {model.state === 'error' && (
                <Text>Failed to load model! {model.error.message}</Text>
            )}
        </View>
    )
}

export default CameraScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
})