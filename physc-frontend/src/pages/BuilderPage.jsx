import React from 'react';
import BuilderToolbar  from '../builder/components/BuilderToolbar';
import LeftPalette     from '../builder/components/LeftPalette';
import RightProperties from '../builder/components/RightProperties';
import BuilderCanvas   from '../builder/components/BuilderCanvas';
import { useEditorStore } from '../store/editorStore';

export default function BuilderPage({ api, ready, error }) {
  const activeTool = useEditorStore(s => s.activeTool);

  return (
    <div className="editor-layout">
      <BuilderToolbar />
      <div className="editor-main">

        <div className="editor-left-panel">
          <LeftPalette />
        </div>

        <div className="editor-center-panel" style={{ position: 'relative' }}>
          <BuilderCanvas />
        </div>

        <div className="editor-right-panel">
          <RightProperties />
        </div>

      </div>
    </div>
  );
}
