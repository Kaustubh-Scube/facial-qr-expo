import { Dimensions } from "react-native"

const { width, height } = Dimensions.get('window')

export const FACE_WIDTH = width * 0.65
export const FACE_HEIGHT = FACE_WIDTH * 1.3
export const FACE_X = (width - FACE_WIDTH) / 2
export const FACE_Y = height * 0.25

export const MASK = {
    centerX: FACE_X + FACE_WIDTH / 2,
    centerY: FACE_Y + FACE_HEIGHT / 2,
};

