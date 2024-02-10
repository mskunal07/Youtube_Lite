import {v2 as cloudinary} from 'cloudinary';  // it required to store the files on cloud as it gives back a url string through which we can access the file
import fs from 'fs';      // fs required to use file handling command it is package of nodejs we do need to install it

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret:process.env.CLOUDINARY_API_SECRET  
});



const uploadOnCloudinary = async (localFilePath) => {

    try {
        if(!localFilePath) return null;

        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:'auto'
        });

        console.log("File uploaded on cloudinary (url) ",response.url);
        fs.unlinkSync(localFilePath);

        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath); // removes the locally saved temporary file from the server as the upload
                                        // got failed
        return null;
    }
}

export {uploadOnCloudinary};