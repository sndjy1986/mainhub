import mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN } from '../lib/distanceConstants';

export async function geocode(address: string): Promise<[number, number]> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.features || data.features.length === 0) throw new Error("Location not found");
  return data.features[0].center; // [lng, lat]
}

export interface MatrixResult {
  distances: number[][];
  durations: number[][];
}

export async function getMatrix(dest: [number, number], sources: [number, number][]): Promise<MatrixResult> {
  const coordString = [dest.join(','), ...sources.map(c => c.join(','))].join(';');
  const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordString}?sources=0&annotations=distance,duration&access_token=${MAPBOX_TOKEN}`;
  
  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== 'Ok') throw new Error("Calculation failure");
  return data;
}

export async function fetchCurrentUsage(): Promise<number> {
  try {
    const res = await fetch("https://api.sndjy.us/api/increment", { method: "GET", mode: "cors" });
    const data = await res.json();
    return data.count || 0;
  } catch (err) {
    console.error("Counter Read Failed:", err);
    return 0;
  }
}

export async function incrementUsage(amount: number): Promise<number> {
  try {
    const res = await fetch("https://api.sndjy.us/api/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incrementBy: amount }),
      mode: "cors",
    });
    const data = await res.json();
    return data.count || 0;
  } catch (err) {
    console.error("Counter Update Failed:", err);
    return 0;
  }
}
