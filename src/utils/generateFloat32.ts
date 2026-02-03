import { File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

export const generateFloat32 = async (data: string) => {
    "worklet";
    
    try {
        const file = new File(Paths.cache, 'Float32.txt');
        file.write(data)
        const content = await FileSystem.readAsStringAsync(file.uri);
        console.log(content);
    } catch (error) {
        console.error(error);
    }

}