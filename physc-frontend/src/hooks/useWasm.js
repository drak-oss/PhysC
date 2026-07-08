import { useState, useEffect } from 'react';

export function useWasm() {
  const [solverModule, setSolverModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWasm = async () => {
      try {
        const script = document.createElement('script');
        script.src = '/solver.js';
        script.onload = async () => {
          if (window.createSolver) {
            const module = await window.createSolver();
            setSolverModule(module);
            setLoading(false);
          } else {
            setError(new Error('createSolver not found. Ensure EXPORT_NAME=createSolver is set.'));
            setLoading(false);
          }
        };
        script.onerror = () => {
          setError(new Error('Failed to load solver.js'));
          setLoading(false);
        };
        document.body.appendChild(script);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    loadWasm();
  }, []);

  return { solverModule, loading, error };
}
