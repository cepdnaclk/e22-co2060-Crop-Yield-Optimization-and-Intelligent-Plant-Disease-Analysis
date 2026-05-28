const url = "https://lqiytbcuhhezawsxgoxl.supabase.co"
const key = "sb_publishable_Lp5Zrzxu21uFkLtCLMr6sQ_YdFiQdrF"

import { createClient } from "@supabase/supabase-js"
const supabase = createClient(url,key)


export default function uploadfile(file){
    const promise = new Promise(
        (resolve,reject)=>{
           if(file == null){
                reject("Please select a file first")
                return

           } 
           const timeStamp = new Date().getTime()
           const fileName = timeStamp+"_"+file.name

            supabase.storage.from("images").upload(fileName,file,{
                cacheControl: "3600",
                upsert: false}
        ).then(() => {

            const publicUrl = supabase.storage.from("images").getPublicUrl(fileName).data.publicUrl
            resolve(publicUrl)
        }
            
        ) .catch(() => {  
            reject("Error uploading file")
        }) 
        }
    )
    return promise
}