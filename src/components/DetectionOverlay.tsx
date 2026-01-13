import React from 'react'
import { Dimensions, StyleSheet } from 'react-native'
import Svg, { Rect, Text } from 'react-native-svg'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

type Detection = {
    xmin: number
    ymin: number
    xmax: number
    ymax: number
    score: number
}

type Props = {
    detections: Detection[]
}

export const DetectionOverlay = ({ detections }: Props) => {
    return (
        <Svg style={StyleSheet.absoluteFill}>
            {detections.map((d, i) => {
                // convert normalized coords → screen coords
                const x = d.xmin * SCREEN_W
                const y = d.ymin * SCREEN_H
                const w = (d.xmax - d.xmin) * SCREEN_W
                const h = (d.ymax - d.ymin) * SCREEN_H

                return (
                    <React.Fragment key={i}>
                        {/* bounding box */}
                        <Rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            stroke="lime"
                            strokeWidth={2}
                            fill="transparent"
                        />

                        {/* score */}
                        <Text
                            x={x + 4}
                            y={y + 14}
                            fill="lime"
                            fontSize="12"
                        >
                            {(d.score * 100).toFixed(1)}%
                        </Text>
                    </React.Fragment>
                )
            })}
        </Svg>
    )
}
