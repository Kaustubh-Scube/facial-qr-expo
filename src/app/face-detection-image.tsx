import ChooseImageButton from '@/components/ChooseImageButton';
import FaceMap from '@/components/FaceMap';
import OptionSwitch from '@/components/OptionSwitch';
import FaceDetection, { Face } from '@react-native-ml-kit/face-detection';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

type Props = {}
interface ImageDetails {
    path: string;
    height: number;
    width: number;
}

const DetectFaceFromGallery = ({ }: Props) => {
    const [image, setImage] = useState<ImageDetails>();
    const [faces, setFaces] = useState<Face[]>([]);
    const [showFrame, setShowFrame] = useState(true);
    const [showLandmarks, setShowLandmarks] = useState(false);
    const [showContours, setShowContours] = useState(false);

    const handleChoose = async (currentImage: ImageDetails) => {
        setImage(currentImage);

        const result = await FaceDetection.detect(currentImage.path, {
            landmarkMode: 'all',
            contourMode: 'all',
        });

        console.log(result, "RESULT")

        setFaces(result);
    };


    /* const pickImage = async () => {
        // No permissions request is necessary for launching the image library.
        // Manually request permissions for videos on iOS when `allowsEditing` is set to `false`
        // and `videoExportPreset` is `'Passthrough'` (the default), ideally before launching the picker
        // so the app users aren't surprised by a system dialog after picking a video.
        // See "Invoke permissions for videos" sub section for more details.

        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission required', 'Permission to access the media library is required.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        console.log(result);

        if (!result.canceled) {
            // setImage(result.assets[0]);
        };
    }; */

    return (
        <View style={styles.container}>
            <ChooseImageButton onChoose={handleChoose} />

            {image && (
                <View style={styles.imageContainer}>
                    <Image source={{ uri: image.path }} style={styles.image} />

                    {faces.map(face => (
                        <FaceMap
                            key={Math.random()}
                            face={face}
                            width={image.width}
                            height={image.height}
                            showFrame={showFrame}
                            showContours={showContours}
                            showLandmarks={showLandmarks}
                        />
                    ))}

                    <OptionSwitch
                        label="Show Frame"
                        value={showFrame}
                        onChange={setShowFrame}
                    />
                    <OptionSwitch
                        label="Show Landmarks"
                        value={showLandmarks}
                        onChange={setShowLandmarks}
                    />
                    <OptionSwitch
                        label="Show Contours"
                        value={showContours}
                        onChange={setShowContours}
                    />

                    <View>
                        <Text>Cropped Image</Text>

                        <Image
                            source={{ uri: image.path }}
                            
                        />  
                    </View>
                </View>
            )}
        </View>
    );
};

export default DetectFaceFromGallery;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        marginTop: 15,
        marginBottom: 20,
        position: 'relative'
    },
    image: {
        width: 200,
        height: 200,
    },
});