import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname)//user may upload multiple file with same name but the file operation will be on server will be for very tiny ammount of time-->then we uploade it on cloudinary--> and then we will delete it.

    }
  })
  
  export const upload = multer({ 
    storage,
 })
// import multer from "multer";
// import path from "path"

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, "./public/temp")
//     },
//     filename: function (req, file, cb) {
      
//       cb(null, file.originalname)
//     }
//   })
  
// export const upload = multer({ 
//     storage, 
// })