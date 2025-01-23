import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { PathStyleExtension } from '@deck.gl/extensions';
import * as turf from '@turf/turf';
import PropTypes from 'prop-types';

import SampleSvg1 from '../assets/react.svg';
import SampleSvg2 from '../assets/unknown.svg';

const INITIAL_VIEW_STATE = {
  longitude: -122.41669,
  latitude: 37.7853,
  zoom: 13,
  pitch: 0,
  bearing: 0
};

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";
const ZOOM_SCALES = [0.05, 0.5, 1, 2, 4, 8, 16, 24, 32, 48, 64, 128, 256, 512, 1000, 2000, 3000, 5000, 10000];

// Hitung resolusi maksimum untuk proyeksi Web Mercator (EPSG:3857)
const EARTH_CIRCUMFERENCE_METERS = 40075016.686; // Panjang keliling bumi dalam meter
const TILE_SIZE = 256; // Ukuran tile dalam pixel
const MAX_RESOLUTION = EARTH_CIRCUMFERENCE_METERS / TILE_SIZE; // Resolusi maksimum pada zoom level 0

// Hitung ulang resolusi berdasarkan skala NM
export const calculateCustomResolution = (valueNm, mapPixel) => {
  const resolution = (valueNm * 1852 * 2) / mapPixel; // 1NM = 1852 meter
  return resolution;
};

// Fungsi untuk menghitung level zoom berdasarkan resolusi
const resolutionToZoomLevel = (resolution) => {
  return Math.log2(MAX_RESOLUTION / resolution);
};

function EditableLayers({ mapStyle = MAP_STYLE }) {
  const [features, setFeatures] = useState({
    type: 'FeatureCollection',
    features: []
  });
  const [mode, setMode] = useState(() => ViewMode);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);
  const [selectedColor, setSelectedColor] = useState([0, 0, 0]);
  const [selectedSvg, setSelectedSvg] = useState(null);
  const [distance, setDistance] = useState(0);
  const [startPoint, setStartPoint] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [selectedZoomIndex, setSelectedZoomIndex] = useState(9);
  const deckRef = useRef();

  const svgOptions = {
    none: null,
    SampleSvg1,
    SampleSvg2,
  };

  const handleRightClick = useCallback((event) => {
    event.preventDefault();
    setMode(() => ViewMode);
    setIsDrawing(false);
  }, []);

  const handleLayerClick = useCallback((info) => {
    setStartPoint(info?.coordinate);
    if (info && info.index !== undefined) {
      setSelectedFeatureIndexes([info.index]);
      setFeatures((prevFeatures) => {
        const newFeatures = { ...prevFeatures };
        prevFeatures.features.forEach((feature, index) => {
          feature.properties.highlighted = index === info.index ? true : null;
          feature.properties.index = index;
        });
        return newFeatures;
      });
    } else {
      setSelectedFeatureIndexes([]);
      setMode(() => ViewMode);
      setIsDrawing(false);
      setFeatures((prevFeatures) => {
        const newFeatures = { ...prevFeatures };
        prevFeatures.features.forEach((feature) => {
          feature.properties.highlighted = null;
        });
        return newFeatures;
      });
    }
  }, []);

  const handleFeatureEdit = useCallback(({ updatedData }) => {
    setFeatures(updatedData);
  }, []);

  const handleHover = useCallback(({ coordinate, object }) => {
    if (isDrawing && startPoint && coordinate) {
      const start = turf.point(startPoint);
      const end = turf.point(coordinate);
      const distance = turf.distance(start, end);

      setDistance(distance);
    }
  }, [isDrawing, startPoint]);

  const handleClick = useCallback(({ coordinate }) => {
    if (isDrawing && !startPoint) {
      setStartPoint(coordinate);
    } else if (isDrawing && startPoint) {
      setIsDrawing(false);
      setStartPoint(null);
    }
  }, [isDrawing, startPoint]);

  const handleColorChange = useCallback((e) => {
    const hex = e.target.value;
    const rgb = hex.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16));
    setSelectedColor(rgb);

    if (selectedFeatureIndexes.length > 0) {
      setFeatures((prevFeatures) => {
        const newFeatures = { ...prevFeatures };
        selectedFeatureIndexes.forEach((index) => {
          newFeatures.features[index].properties.color = rgb;
          newFeatures.features[index].properties.highlighted = null;
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

  const handleFillAndLineColorChange = useCallback((feature) => {
    if (feature.properties.icon) {
      return [0, 0, 0, 0];
    }

    if (selectedFeatureIndexes.includes(feature.properties.index) && feature.properties.highlighted) {
      return [255, 255, 0, 255];
    }

    return feature.properties.color || [0, 0, 0, 255];
  }, [selectedFeatureIndexes]);

  const handleZoomChange = (event) => {
    console.log('zoomChange', event.target.value);
    
    const newZoomIndex = parseInt(event.target.value, 10);
    setSelectedZoomIndex(newZoomIndex);
  };
  
  const handleWheel = (e) => {
    const zoomDelta = e.deltaY > 0 ? 1: -1; 
    let newZoomIndex = selectedZoomIndex + zoomDelta;
  
    // Pastikan zoom index berada dalam batas array
    newZoomIndex = Math.max(0, Math.min(ZOOM_SCALES.length - 1, newZoomIndex));
  
    // Perbarui zoom level dan view state
    setSelectedZoomIndex(newZoomIndex);
  };
  
  useEffect(() => {
    const mapCanvas = deckRef.current?.deck?.getCanvas();
    if (!mapCanvas) return;
  
    const mapPixel = mapCanvas.width;
  
    // Hitung resolusi berdasarkan skala (NM) dan konversi ke zoom level
    const customResolution = calculateCustomResolution(
      ZOOM_SCALES[selectedZoomIndex], 
      mapPixel
    );
    const zoomLevel = resolutionToZoomLevel(customResolution);  
    setViewState((prevState) => ({
      ...prevState,
      zoom: zoomLevel,
    }));
  }, [selectedZoomIndex]);

  const layer = new EditableGeoJsonLayer({
    id: 'geojson-layer',
    data: features,
    mode,
    selectedFeatureIndexes,
    pickable: true,
    onEdit: handleFeatureEdit,
    getFillColor: handleFillAndLineColorChange,
    getLineColor: handleFillAndLineColorChange,
    getIcon: (feature) => feature.properties.svg ? {
      url: feature.properties.svg,
      width: 128,
      height: 128,
    } : null,
    getDashArray: () => [10, 5],
    extensions: [new PathStyleExtension({ dash: true })],
    onHover: handleHover,
    onClick: handleClick,
  });

  const handleWindowPointer = useCallback((event) => {
    if (event && event.pointerType === 'mouse') {
      setMousePosition({ x: event.clientX, y: event.clientY });;
    }
  }, [handleHover]);

  const iconLayer = new IconLayer({
    id: 'icon-layer',
    data: features.features.filter(feature => feature.properties.icon),
    getIcon: d => ({
      url: svgOptions[d.properties.icon],
      width: 128,
      height: 128,
    }),
    sizeScale: 5,
    getPosition: d => d.geometry.coordinates,
    getSize: 5,
    getColor: [255, 0, 0],
  });

  return (
    <div className='absolute top-0 left-0 right-0 bottom-0' onContextMenu={handleRightClick} onPointerMove={handleWindowPointer} onWheel={handleWheel}>
      <div className='controls'>
        <button 
          onClick={() => { setMode(() => DrawPointMode); setIsDrawing(true); }} 
          disabled={isDrawing}
        >
          Point
        </button>
        <button 
          onClick={() => { setMode(() => DrawLineStringMode); setIsDrawing(true); }} 
          disabled={isDrawing}
        >
          Line
        </button>
        <button 
          onClick={() => { setMode(() => DrawPolygonMode); setIsDrawing(true); }} 
          disabled={isDrawing}
        >
          Polygon
        </button>
      </div>

      <select
        value={selectedZoomIndex}
        onChange={handleZoomChange}
        style={{
          position: "absolute",
          top: 30,
          left: 10,
          zIndex: 1,
          padding: "10px",
          backgroundColor: "#fff",
        }}
      >
        {ZOOM_SCALES.map((scale, index) => (
          <option key={scale} value={index}>
            {scale} NM
          </option>
        ))}
      </select>

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

      {isDrawing && startPoint && (
        <div 
          style={{
            position: 'absolute',
            top: mousePosition.y - 10, // Adjust to place above the cursor
            left: mousePosition.x + 10, // Adjust to place next to the cursor
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '5px',
            borderRadius: '5px',
            zIndex: 2
          }}
        >
          <p>Distance: {distance.toFixed(2)} km</p>
        </div>
      )}

      <DeckGL
        ref={deckRef}
        viewState={viewState}
        controller={{
          doubleClickZoom: false,
          rightClickZoom: false,
          scrollZoom: true
        }}
        layers={[layer, iconLayer]}
        onClick={handleLayerClick}
      >
        <MapLibre reuseMaps mapStyle={mapStyle} />
      </DeckGL>
    </div>
  );
}

EditableLayers.propTypes = {
  mapStyle: PropTypes.string,
};

export default EditableLayers;
