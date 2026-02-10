import {
    Canvas,
    Path,
    Rect,
    Skia,
} from '@shopify/react-native-skia'
import React from 'react'
import { Dimensions, StyleSheet } from 'react-native'

const { width, height } = Dimensions.get('window')

const FACE_WIDTH = width * 0.65
const FACE_HEIGHT = FACE_WIDTH * 1.3
const FACE_X = (width - FACE_WIDTH) / 2
const FACE_Y = height * 0.25

export const FaceAlignOverlay = () => {
    // Full screen
    const outer = Skia.Path.Make()
    outer.addRect(
        Skia.XYWHRect(0, 0, width, height)
    )

    // Face oval
    const faceOval = Skia.Path.Make()
    faceOval.addOval(
        Skia.XYWHRect(
            FACE_X,
            FACE_Y,
            FACE_WIDTH,
            FACE_HEIGHT
        )
    )

    // Combine paths → cut-out
    const maskPath = Skia.Path.Make()
    maskPath.addPath(outer)
    maskPath.addPath(faceOval)
    maskPath.setFillType(1) // EVEN_ODD

    return (
        <Canvas style={StyleSheet.absoluteFill}>
            {/* Dark overlay with oval cut-out */}
            <Path
                path={maskPath}
                color="rgba(0,0,0,0.7)"
            />

            {/* Face outline */}
            <Path
                path={faceOval}
                style="stroke"
                strokeWidth={3}
                color="rgba(255,255,255,0.9)"
            />

            {/* Center vertical guide */}
            <Rect
                x={width / 2 - 1}
                y={FACE_Y + 20}
                width={2}
                height={FACE_HEIGHT - 40}
                color="rgba(255,255,255,0.4)"
            />

            {/* Eye alignment line */}
            <Rect
                x={FACE_X + 40}
                y={FACE_Y + FACE_HEIGHT * 0.38}
                width={FACE_WIDTH - 80}
                height={2}
                color="rgba(255,255,255,0.4)"
            />
        </Canvas>
    )
}
