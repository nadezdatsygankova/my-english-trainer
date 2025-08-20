import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, err:null }; }
  static getDerivedStateFromError(err){ return { hasError:true, err }; }
  componentDidCatch(error, info){ console.error("[ErrorBoundary]", error, info); }

  render(){
    if(!this.state.hasError) return this.props.children;
    return (
      <div style={{padding:24, fontFamily:"system-ui"}}>
        <h2>Something went wrong</h2>
        <p style={{color:"#64748b"}}>Try reloading the page. If it keeps happening, export your data and share the steps to reproduce.</p>
        <details style={{whiteSpace:"pre-wrap", marginTop:12}}>
          {String(this.state.err || "")}
        </details>
        <button onClick={()=>location.reload()} style={{marginTop:12, padding:"8px 12px"}}>Reload</button>
      </div>
    );
  }
}