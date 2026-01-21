"use client";

import { useEffect } from "react";

export default function Logo() {
  const LOGO_PATH = "/ConversionLogo.svg";

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/4926bdf5-7fdc-4c8e-a472-88fa0d4a299d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Logo.tsx:9',message:'Logo component mounted',data:{logoPath:LOGO_PATH},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }, []);

  const handleLoad = () => {
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/4926bdf5-7fdc-4c8e-a472-88fa0d4a299d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Logo.tsx:15',message:'Logo image loaded successfully',data:{src:LOGO_PATH},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const imgElement = e.currentTarget;
    const attemptedSrc = imgElement.src;
    const fullUrl = typeof window !== 'undefined' ? window.location.origin + LOGO_PATH : LOGO_PATH;
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/4926bdf5-7fdc-4c8e-a472-88fa0d4a299d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Logo.tsx:22',message:'Logo image load error',data:{src:LOGO_PATH,attemptedSrc,fullUrl,error:'Image failed to load - checking if file exists',windowOrigin:typeof window !== 'undefined' ? window.location.origin : 'server'},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Try to verify file exists by fetching it
    if (typeof window !== 'undefined') {
      fetch(fullUrl, { method: 'HEAD' })
        .then(response => {
          // #region agent log
          fetch('http://127.0.0.1:7248/ingest/4926bdf5-7fdc-4c8e-a472-88fa0d4a299d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Logo.tsx:30',message:'Logo file HEAD request result',data:{status:response.status,statusText:response.statusText,url:fullUrl,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
        })
        .catch(err => {
          // #region agent log
          fetch('http://127.0.0.1:7248/ingest/4926bdf5-7fdc-4c8e-a472-88fa0d4a299d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Logo.tsx:35',message:'Logo file HEAD request failed',data:{error:err.message,url:fullUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
        });
    }
    
    console.error(`Logo failed to load from ${LOGO_PATH}`);
  };

  return (
    <img 
      src={LOGO_PATH}
      alt="Conversion Interactive Agency" 
      style={{ height: "40px", width: "auto", maxWidth: "200px", paddingLeft: "16px" }}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}
