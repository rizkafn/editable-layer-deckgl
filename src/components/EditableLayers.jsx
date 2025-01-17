import React, { useState, useCallback } from 'react';
import DeckGL from 'deck.gl';
import {
  EditableGeoJsonLayer,
  DrawLineStringMode,
  DrawPolygonMode,
  DrawPointMode,
  ViewMode,
} from '@deck.gl-community/editable-layers';
import '../index.css';

const INITIAL_VIEW_STATE = {
  longitude: -122.41669,
  latitude: 37.7853,
  zoom: 13,
  pitch: 0,
  bearing: 0
};

function EditableLayers() {
  const [features, setFeatures] = useState({
    type: 'FeatureCollection',
    features: []
  });
  const [mode, setMode] = useState(() => DrawPointMode);
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);

  const handleRightClick = useCallback((event) => {
    event.preventDefault();
    setMode(() => ViewMode); // Nonaktifkan mode draw
  }, []);

  const handleLayerClick = useCallback((info) => {
    if (info && info.index !== undefined) {
      setSelectedFeatureIndexes([info.index]); // Pilih fitur yang diklik
    } else {
      setSelectedFeatureIndexes([]); // Hapus pilihan jika klik di area kosong
      setMode(() => ViewMode)
    }
  }, []);

  const handleFeatureEdit = useCallback(({ updatedData }) => {
    setFeatures(updatedData);
  }, []);

  const layer = new EditableGeoJsonLayer({
    id: 'geojson-layer',
    data: features,
    mode,
    selectedFeatureIndexes,
    onEdit: handleFeatureEdit,
    pickable: true
  });

  return (
    <div className='absolute top-0 left-0 right-0 bottom-0' onContextMenu={handleRightClick}>
      <div className='controls'>
        <button onClick={() => setMode(() => DrawPointMode)}>Point</button>
        <button onClick={() => setMode(() => DrawLineStringMode)}>Line</button>
        <button onClick={() => setMode(() => DrawPolygonMode)}>Polygon</button>
        {/* Tambahkan tombol lainnya sesuai kebutuhan */}
      </div>

      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={{
          doubleClickZoom: false,
          rightClickZoom: false
        }}
        layers={[layer]}
        onClick={handleLayerClick}
      >
      </DeckGL>
    </div>
  );
}

export default EditableLayers;
