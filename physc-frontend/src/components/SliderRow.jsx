import React, { useRef, useEffect } from 'react';

export function SliderRow({ label, liveValue, min, max, step = 0.01, precision, readOnly = false, onCommit, onFinalCommit, unit = '' }) {
    const numberRef = useRef(null);
    const sliderRef = useRef(null);
    const focused   = useRef(false);
    const calcDecimals = step < 0.01 ? 4 : step < 0.1 ? 3 : step < 1 ? 2 : 0;
    const decimals  = precision !== undefined ? precision : calcDecimals;

    useEffect(() => {
        if (focused.current) return;
        const v = parseFloat(liveValue);
        if (isNaN(v)) return;
        if (numberRef.current) numberRef.current.value = v.toFixed(decimals);
        if (sliderRef.current) sliderRef.current.value = v;
    }, [liveValue, decimals]);

    const clamp  = (v) => Math.min(max, Math.max(min, v));
    const commit = (raw) => {
        const v = parseFloat(raw);
        if (!isNaN(v) && onCommit) onCommit(clamp(v));
    };
    const finalCommit = (raw) => {
        const v = parseFloat(raw);
        if (!isNaN(v) && onFinalCommit) onFinalCommit(clamp(v));
    };

    return (
        <div className="slider-row">
            <div className="slider-label-row">
                <span className="slider-label" style={{ color: readOnly ? 'var(--text-disabled)' : 'var(--text-secondary)' }}>
                    {label}
                </span>
                <div className="slider-number-wrap">
                    <input
                        ref={numberRef}
                        type="number"
                        className="slider-number"
                        step={step}
                        min={min}
                        max={max}
                        defaultValue={parseFloat(liveValue)?.toFixed(decimals) ?? '0'}
                        readOnly={readOnly}
                        disabled={readOnly}
                        style={readOnly ? { color: 'var(--text-disabled)', cursor: 'default' } : {}}
                        onFocus={() => { focused.current = true; }}
                        onBlur={(e) => { focused.current = false; commit(e.target.value); finalCommit(e.target.value); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        onChange={() => {}}
                    />
                    {unit && <span className="slider-unit">{unit}</span>}
                </div>
            </div>
            <input
                ref={sliderRef}
                type="range"
                className={`slider-track ${readOnly ? 'readonly' : ''}`}
                min={min}
                max={max}
                step={step}
                defaultValue={liveValue}
                disabled={readOnly}
                onInput={(e) => {
                    if (!readOnly && numberRef.current)
                        numberRef.current.value = parseFloat(e.target.value).toFixed(decimals);
                }}
                onChange={(e) => { if (!readOnly) commit(e.target.value); }}
                onMouseDown={() => { if (!readOnly) focused.current = true; }}
                onMouseUp={(e)  => { if (!readOnly) { focused.current = false; commit(e.target.value); finalCommit(e.target.value); } }}
                onTouchEnd={(e) => { if (!readOnly) { focused.current = false; commit(e.target.value); finalCommit(e.target.value); } }}
            />
        </div>
    );
}

export function Section({ title, badge, color }) {
    return (
        <div className="inspector-section-header" style={color ? { color } : {}}>
            <span>{title}</span>
            {badge && <span className="live-badge">{badge}</span>}
        </div>
    );
}

export function ReadRow({ label, value, unit = '' }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-disabled)' }}>
                {typeof value === 'number' ? value.toFixed(3) : value}
                {unit && <span style={{ opacity: 0.5, marginLeft: 3 }}>{unit}</span>}
            </span>
        </div>
    );
}
