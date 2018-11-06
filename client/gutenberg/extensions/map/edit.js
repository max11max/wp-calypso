/** @format */

/**
 * External dependencies
 */

import { __, sprintf } from '@wordpress/i18n';
import { Component, createRef, Fragment, RawHTML } from '@wordpress/element';
import {
	Button,
	ButtonGroup,
	IconButton,
	PanelBody,
	Placeholder,
	Spinner,
	ToggleControl,
	Toolbar,
	TextControl,
	withNotices,
} from '@wordpress/components';
import {
	InspectorControls,
	BlockControls,
	BlockAlignmentToolbar,
	PanelColorSettings,
} from '@wordpress/editor';
import apiFetch from '@wordpress/api-fetch';
import debounce from 'lodash/debounce';

/**
 * Internal dependencies
 */

import { settings } from './settings.js';
import AddPoint from './add-point';
import Locations from './locations';
import Map from './component.js';
import MapThemePicker from './map-theme-picker';

const API_STATE_LOADING = 0;
const API_STATE_FAILURE = 1;
const API_STATE_SUCCESS = 2;

class MapEdit extends Component {
	constructor() {
		super( ...arguments );
		this.state = {
			addPointVisibility: false,
			apiState: API_STATE_LOADING,
		};
		this.mapRef = createRef();
		this.debouncedUpdateAPIKey = debounce( this.updateAPIKey, 800 );
	}
	componentWillUnmount() {
		this.debouncedAPIKey.cancel();
	}
	addPoint = point => {
		const { attributes, setAttributes } = this.props;
		const { points } = attributes;
		const newPoints = points.slice( 0 );
		let duplicateFound = false;
		points.map( existingPoint => {
			if ( existingPoint.id === point.id ) {
				duplicateFound = true;
			}
		} );
		if ( duplicateFound ) {
			return;
		}
		newPoints.push( point );
		setAttributes( { points: newPoints } );
		this.setState( { addPointVisibility: false } );
	};
	updateAlignment = value => {
		this.props.setAttributes( { align: value } );
		// Allow one cycle for alignment change to take effect
		setTimeout( this.mapRef.current.sizeMap, 0 );
	};
	updateAPIKeyControl = value => {
		this.setState( { apiKeyControl: value }, this.debouncedUpdateAPIKey );
	};
	updateAPIKey = () => {
		const { noticeOperations } = this.props;
		const { apiKeyControl } = this.state;
		noticeOperations.removeAllNotices();
		apiKeyControl && this.apiCall( apiKeyControl, 'POST' );
	};
	removeAPIKey = () => {
		this.apiCall( null, 'DELETE' );
	};
	apiCall( service_api_key = null, method = 'GET' ) {
		const { noticeOperations, attributes } = this.props;
		const { map_service } = attributes;
		const url = this.apiURLForService( map_service );
		const fetch = service_api_key ? { url, method, data: { service_api_key } } : { url, method };
		apiFetch( fetch ).then(
			result => {
				noticeOperations.removeAllNotices();
				this.setState( {
					apiState: result.service_api_key ? API_STATE_SUCCESS : API_STATE_FAILURE,
					api_key: result.service_api_key,
					apiKeyControl: result.service_api_key,
				} );
			},
			result => {
				this.onError( null, result.message );
				this.setState( {
					apiState: API_STATE_FAILURE,
				} );
			}
		);
	}
	apiURLForService = map_service => {
		return '/wp-json/jetpack/v4/service-api-keys/' + map_service;
	};
	componentDidMount() {
		this.apiCall();
	}
	onError = ( code, message ) => {
		const { noticeOperations } = this.props;
		noticeOperations.removeAllNotices();
		noticeOperations.createErrorNotice( message );
	};
	render() {
		const { className, setAttributes, attributes, noticeUI, notices } = this.props;
		const {
			map_style,
			map_details,
			points,
			zoom,
			map_center,
			marker_color,
			align,
			map_service,
		} = attributes;
		const { addPointVisibility, api_key, apiKeyControl, apiState } = this.state;
		const inspectorControls = (
			<Fragment>
				<BlockControls>
					<BlockAlignmentToolbar
						value={ align }
						onChange={ this.updateAlignment }
						controls={ [ 'center', 'wide', 'full' ] }
					/>
					<Toolbar>
						<IconButton
							icon={ settings.markerIcon }
							label="Add a marker"
							onClick={ () => this.setState( { addPointVisibility: true } ) }
						/>
					</Toolbar>
				</BlockControls>
				<InspectorControls>
					<PanelBody title={ __( 'Map Theme', 'jetpack' ) }>
						<MapThemePicker
							value={ map_style }
							onChange={ value => setAttributes( { map_style: value } ) }
							options={ settings.map_styleOptions }
						/>
						<ToggleControl
							label={ __( 'Show street names', 'jetpack' ) }
							checked={ map_details }
							onChange={ value => setAttributes( { map_details: value } ) }
						/>
					</PanelBody>
					<PanelColorSettings
						title={ __( 'Colors', 'jetpack' ) }
						initialOpen={ true }
						colorSettings={ [
							{
								value: marker_color,
								onChange: value => setAttributes( { marker_color: value } ),
								label: 'Marker Color',
							},
						] }
					/>
					{ points.length ? (
						<PanelBody title={ __( 'Markers', 'jetpack' ) } initialOpen={ false }>
							<Locations
								points={ points }
								onChange={ value => {
									setAttributes( { points: value } );
								} }
							/>
						</PanelBody>
					) : null }
					{ 'mapbox' === map_service && (
						<PanelBody title={ __( 'Mapbox Access Token', 'jetpack' ) } initialOpen={ false }>
							<TextControl
								label={ __( 'Mapbox Access Token', 'jetpack' ) }
								value={ apiKeyControl }
								onChange={ value => this.setState( { apiKeyControl: value } ) }
							/>
							<ButtonGroup>
								<Button type="button" onClick={ this.updateAPIKey } isDefault>
									{ __( 'Update Key' ) }
								</Button>
								<Button type="button" onClick={ this.removeAPIKey } isDefault>
									{ __( 'Remove Key' ) }
								</Button>
							</ButtonGroup>
						</PanelBody>
					) }
					{ 'googlemaps' === map_service && (
						<PanelBody title={ __( 'Google Maps API Key', 'jetpack' ) } initialOpen={ false }>
							<TextControl
								label={ __( 'Mapbox Access Token', 'jetpack' ) }
								value={ apiKeyControl }
								onChange={ value => this.setState( { apiKeyControl: value } ) }
							/>
							<ButtonGroup>
								<Button type="button" onClick={ this.updateAPIKey } isDefault>
									{ __( 'Update Key' ) }
								</Button>
								<Button type="button" onClick={ this.removeAPIKey } isDefault>
									{ __( 'Remove Key' ) }
								</Button>
							</ButtonGroup>
						</PanelBody>
					) }
				</InspectorControls>
			</Fragment>
		);
		const placholderAPIStateLoading = (
			<Placeholder icon={ settings.icon }>
				<Spinner />
			</Placeholder>
		);
		const apiInstructions = this.apiInstructionsForMapService( map_service );
		const placeholderAPIStateFailure = (
			<Placeholder icon={ settings.icon } label={ __( 'Map', 'jetpack' ) } notices={ notices }>
				<Fragment>
					<div className="components-placeholder__instructions">
						<RawHTML>{ apiInstructions }</RawHTML>
					</div>
					<TextControl
						placeholder="Paste Key Here"
						value={ apiKeyControl }
						onChange={ this.updateAPIKeyControl }
					/>
				</Fragment>
			</Placeholder>
		);
		const placeholderAPIStateSuccess = (
			<Fragment>
				{ inspectorControls }
				<div className={ className }>
					<Map
						ref={ this.mapRef }
						map_style={ map_style }
						map_details={ map_details }
						points={ points }
						zoom={ zoom }
						map_center={ map_center }
						marker_color={ marker_color }
						onSetZoom={ value => {
							setAttributes( { zoom: value } );
						} }
						admin={ true }
						api_key={ api_key }
						map_service={ map_service }
						onSetPoints={ value => setAttributes( { points: value } ) }
						onMapLoaded={ () => this.setState( { addPointVisibility: true } ) }
						onMarkerClick={ () => this.setState( { addPointVisibility: false } ) }
						onError={ this.onError }
					>
						{ addPointVisibility && (
							<AddPoint
								onAddPoint={ this.addPoint }
								onClose={ () => this.setState( { addPointVisibility: false } ) }
								api_key={ api_key }
								map_service={ map_service }
								onError={ this.onError }
							/>
						) }
					</Map>
				</div>
			</Fragment>
		);
		return (
			<Fragment>
				{ noticeUI }
				{ apiState === API_STATE_LOADING && placholderAPIStateLoading }
				{ apiState === API_STATE_FAILURE && placeholderAPIStateFailure }
				{ apiState === API_STATE_SUCCESS && placeholderAPIStateSuccess }
			</Fragment>
		);
	}
	apiInstructionsForMapService = map_service => {
		switch ( map_service ) {
			case 'googlemaps':
				return sprintf(
					"This is your first map block. You need to get a Google Maps API key. <a href='%s' target='_blank'>Here's how to do it</a>.",
					'https://developers.google.com/maps/documentation/javascript/get-api-key'
				);
			case 'mapbox':
				return sprintf(
					"<p>Before you use a map block, you will need to get a key from <a href='%1$s'>Mapbox</a>. You will only have to do this once.</p><p>Go to <a href='%1$s'>Mapbox</a> and either create an account or sign in. Once you sign in, locate and copy the default access token. Finally, paste it into the token field below.</p>",
					'https://www.mapbox.com'
				);
		}
	};
}

export default withNotices( MapEdit );