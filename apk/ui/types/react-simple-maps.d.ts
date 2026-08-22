declare module 'react-simple-maps' {
  import * as React from 'react'

  export interface ComposableMapProps {
    projection?: string
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    style?: React.CSSProperties
    children?: React.ReactNode
  }

  export interface ZoomableGroupProps {
    center?: [number, number]
    zoom?: number
    minZoom?: number
    maxZoom?: number
    children?: React.ReactNode
  }

  export interface GeographiesProps {
    geography: string | Record<string, unknown>
    children: (data: { geographies: { rsmKey: string }[] }) => React.ReactNode
  }

  export interface GeographyProps {
    geography: unknown
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: Record<string, Record<string, string>>
    [key: string]: unknown
  }

  export interface MarkerProps {
    coordinates: [number, number]
    style?: React.CSSProperties
    children?: React.ReactNode
    onClick?: (event: React.MouseEvent) => void
    onMouseEnter?: (event: React.MouseEvent) => void
    onMouseLeave?: (event: React.MouseEvent) => void
    [key: string]: unknown
  }

  export const ComposableMap: React.FC<ComposableMapProps>
  export const ZoomableGroup: React.FC<ZoomableGroupProps>
  export const Geographies: React.FC<GeographiesProps>
  export const Geography: React.FC<GeographyProps>
  export const Marker: React.FC<MarkerProps>
}
