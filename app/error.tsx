'use client';
export default function Error({reset}:{reset:()=>void}){return <div className="loading-screen"><h1>Something interrupted this view.</h1><p>Your saved workforce data is still on the server.</p><button onClick={reset}>Try again</button></div>;}
