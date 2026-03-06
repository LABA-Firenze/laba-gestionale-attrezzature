import React, { useState, useEffect } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import QRCode from 'qrcode';

const QRCodeGenerator = ({ item, onClose, embedded = false }) => {
 const [qrCodeUrl, setQrCodeUrl] = useState('');
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const generateQRCode = async () => {
 try {
 setLoading(true);
 // Crea un URL che punta all'oggetto specifico
 const qrData = `${window.location.origin}/inventario/${item.id}`;
        const url = await QRCode.toDataURL(qrData, {
          width: 128,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
 setQrCodeUrl(url);
 } catch (error) {
 console.error('Errore nella generazione del QR code:', error);
 } finally {
 setLoading(false);
 }
 };

 if (item) {
 generateQRCode();
 }
 }, [item]);

 const downloadQRCode = () => {
 const link = document.createElement('a');
 link.download = `QR-${item.nome.replace(/\s+/g, '-')}.png`;
 link.href = qrCodeUrl;
 link.click();
 };

if (!item) return null;

// Se embedded, renderizza solo il contenuto senza modal
if (embedded) {
  return (
    <div className="text-center">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Generazione QR Code...</span>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <img src={qrCodeUrl} alt={`QR Code per ${item.nome}`} className="mx-auto" />
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <p><strong>Oggetto:</strong> {item.nome}</p>
            <p><strong>Scaffale:</strong> {item.posizione || item.scaffale || 'N/A'}</p>
            <p><strong>Categoria:</strong> {item.categoria_nome || `${item.categoria_madre} - ${item.categoria_figlia}`}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={downloadQRCode}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Scarica QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999]">
    <div className="bg-white rounded-lg p-4 w-full mx-4" style={{ maxWidth: '30rem' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">QR Code - {item.nome}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <HiOutlineXMark className="w-5 h-5" />
        </button>
      </div>

      <div className="text-center">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white p-2 rounded-lg border border-gray-200 inline-block">
              <img src={qrCodeUrl} alt={`QR Code per ${item.nome}`} className="w-32 h-32" />
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Oggetto:</strong> {item.nome}</p>
              <p><strong>Scaffale:</strong> {item.posizione || item.scaffale || 'N/A'}</p>
              <p><strong>Categoria:</strong> {item.categoria_nome || `${item.categoria_madre} - ${item.categoria_figlia}`}</p>
            </div>

            <button
              onClick={downloadQRCode}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Scarica QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default QRCodeGenerator;
