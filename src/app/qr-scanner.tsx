import { decodeQRDataRN } from '@/utils/decompression';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import BarcodeMask, { LayoutRectangle } from 'react-native-barcode-mask';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from "react-native-vision-camera";

type Props = {}

const DECODE_KEY = new Uint8Array([
    0x83, 0x35, 0xad, 0x8a, 0x64, 0x5b, 0x27, 0xc5,
    0xb3, 0x8e, 0xd3, 0xe5, 0x75, 0xa0, 0x8d, 0x34,
    0x57, 0x78, 0x86, 0xbd, 0x0c, 0xb2, 0x3f, 0x9e,
    0xdd, 0x13, 0xf5, 0x4c, 0xb3, 0x34, 0xe6, 0x2f
]);

const QrScannerScreen = ({ }: Props) => {

    const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const [barcodeMaskLayout, setBarcodeMaskLayout] = useState<{ target: number, layout: LayoutRectangle }>()

    const isFocused = useIsFocused();
    const device = useCameraDevice("back");
    const scannedRef = useRef<boolean>(false);
    const cameraRef = useRef<Camera>(null);

    useEffect(() => {
        if (!hasCameraPermission) {
            requestCameraPermission();
        };
        
        // return () => {
        //     cameraRef.current.
        // }
    }, []);

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            if (scannedRef.current) return;

            const value = codes[0]?.value;
            if (!value) return;

            scannedRef.current = true;

            // 👇 call async logic safely
            // console.log(value, "VALUES");
            handleQrScanned(value);
        },
    });

    const handleQrScanned = async (value: string) => {
        try {
            const decodedValue = await decodeQRDataRN(value, DECODE_KEY);

            router.replace({
                pathname: '/face-scanner',
                params: {
                    scannerValue: decodedValue.face_base64,
                    otherData: decodedValue.other_data
                },
            });
        } catch (e) {
            console.error('QR decode failed', e);
        }
    };

    if (!device) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text>
                    Please check if the device camera is not damage or restart the device.
                </Text>
            </View>
        )
    };

    if (!hasCameraPermission) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>
                    Please allow the camera permission to use this feature
                </Text>
            </View>
        )
    }

    return (
        <View style={{ flex: 1 }}>
            {isFocused && (
                <Camera
                    ref={cameraRef}
                    style={{ flex: 1 }}
                    device={device}
                    isActive={isFocused}
                    codeScanner={codeScanner}
                />
            )}

            <BarcodeMask
                height={300}
                width={300}
                showAnimatedLine={false}
                edgeRadius={4}
                onLayoutMeasured={({ nativeEvent }) => setBarcodeMaskLayout(nativeEvent)}
            />
        </View>
    )
}

export default QrScannerScreen