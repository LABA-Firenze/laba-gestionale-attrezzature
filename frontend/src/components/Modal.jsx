import React, { useEffect } from 'react'

export default function Modal({ title, children, onClose, footer }){
 useEffect(()=>{
 const onKey=(e)=>{
 if(e.key==='Escape') onClose?.()
 if(e.key==='Enter'){
 const btn = document.querySelector('.modal .modal-footer .btn-primary')
 if(btn) btn.click()
 }
 }
 document.addEventListener('keydown', onKey)
 return ()=> document.removeEventListener('keydown', onKey)
 },[onClose])

 return (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4" onClick={onClose}>
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h3 className="text-lg font-semibold">{title}</h3>
 <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={onClose}>✕</button>
 </div>
 <div className="p-6">{children}</div>
 <div className="flex justify-end gap-2 p-6 border-t border-gray-200">{footer}</div>
 </div>
 </div>
 )
}
