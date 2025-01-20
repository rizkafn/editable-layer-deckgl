import React, { useState, useCallback } from 'react';
import DeckGL from 'deck.gl';
import { Map as MapLibre } from "react-map-gl/maplibre";
import {
  EditableGeoJsonLayer,
  DrawLineStringMode,
  DrawPolygonMode,
  DrawPointMode,
  ViewMode,
} from '@deck.gl-community/editable-layers';
import { IconLayer } from '@deck.gl/layers';
import '../index.css';

// Impor SVG
import SampleSvg1 from '../assets/react.svg';
import SampleSvg2 from '../assets/unknown.svg';

const INITIAL_VIEW_STATE = {
  longitude: -122.41669,
  latitude: 37.7853,
  zoom: 13,
  pitch: 0,
  bearing: 0
};

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";

function EditableLayers({ mapStyle = MAP_STYLE }) {
  const [features, setFeatures] = useState({
    type: 'FeatureCollection',
    features: []
  });
  const [mode, setMode] = useState(() => DrawPointMode);
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);
  const [selectedColor, setSelectedColor] = useState([0, 0, 0]);
  const [selectedSvg, setSelectedSvg] = useState(null);

  const svgOptions = {
    none: null,
    SampleSvg1,
    SampleSvg2,
  };

  const handleRightClick = useCallback((event) => {
    event.preventDefault();
    setMode(() => ViewMode); // Nonaktifkan mode draw
  }, []);

  const handleLayerClick = useCallback((info) => {
    if (info && info.index !== undefined) {
      setSelectedFeatureIndexes([info.index]); // Pilih fitur yang diklik
    } else {
      setSelectedFeatureIndexes([]); // Hapus pilihan jika klik di area kosong
      setMode(() => ViewMode);
    }
  }, []);

  const handleFeatureEdit = useCallback(({ updatedData }) => {
    setFeatures(updatedData);
  }, []);

  const handleColorChange = useCallback((e) => {
    const hex = e.target.value;
    const rgb = hex.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16));
    setSelectedColor(rgb);

    if (selectedFeatureIndexes.length > 0) {
      setFeatures((prevFeatures) => {
        const newFeatures = { ...prevFeatures };
        selectedFeatureIndexes.forEach((index) => {
          newFeatures.features[index].properties.color = rgb;
        });
        return newFeatures;
      });
    }
  }, [selectedFeatureIndexes]);

  const handleSvgChange = useCallback((e) => {
    const svgKey = e.target.value;
    const svg = svgOptions[svgKey];
    
    setSelectedSvg(svg);
  
    if (selectedFeatureIndexes.length > 0) {
      setFeatures((prevFeatures) => {
        const newFeatures = { ...prevFeatures };
        selectedFeatureIndexes.forEach((index) => {
          newFeatures.features[index].properties.icon = svg ? svgKey : null;
        });
        return newFeatures;
      });
    }
  }, [selectedFeatureIndexes, svgOptions]);

  const layer = new EditableGeoJsonLayer({
    id: 'geojson-layer',
    data: features,
    mode,
    selectedFeatureIndexes,
    pickable: true,
    onEdit: handleFeatureEdit,
    getFillColor: (feature) => feature.properties.icon ? [0, 0, 0, 0] : (feature.properties.color || [0, 0, 0, 255]),
    getLineColor: (feature) => feature.properties.icon ? [0, 0, 0, 0] : (feature.properties.color || [0, 0, 0, 255]),
  });
  

  const iconLayer = new IconLayer({
    id: 'icon-layer',
    data: features.features.filter(feature => feature.properties.icon),
    getIcon: d => ({
      url: svgOptions[d.properties.icon],
      width: 128,
      height: 128,
    }),
    sizeScale: 15,
    getPosition: d => d.geometry.coordinates,
    getSize: 5,
    getColor: [255, 0, 0],
  });

  return (
    <div className='absolute top-0 left-0 right-0 bottom-0' onContextMenu={handleRightClick}>
      <div className='controls'>
        <button onClick={() => setMode(() => DrawPointMode)}>Point</button>
        <button onClick={() => setMode(() => DrawLineStringMode)}>Line</button>
        <button onClick={() => setMode(() => DrawPolygonMode)}>Polygon</button>
      </div>

      {selectedFeatureIndexes.length > 0 && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1 }}>
          <input
            type="color"
            value={`#${selectedColor.map(c => c.toString(16).padStart(2, '0')).join('')}`}
            onChange={handleColorChange}
          />
          <select onChange={handleSvgChange}>
            <option value="none">None</option>
            <option value="SampleSvg1">Sample SVG 1</option>
            <option value="SampleSvg2">Sample SVG 2</option>
          </select>
        </div>
      )}

      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={{
          doubleClickZoom: false,
          rightClickZoom: false
        }}
        layers={[layer, iconLayer]}
        onClick={handleLayerClick}
      >
        <MapLibre reuseMaps mapStyle={mapStyle} />
      </DeckGL>
    </div>
  );
}

export default EditableLayers;
