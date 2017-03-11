/* @flow */
import {View, Text, Image, TouchableOpacity, TextInput, Animated, Platform} from 'react-native';
import React from 'react';
import styles from './query-assist.styles';
import QueryAssistSuggestionsList from './query-assist__suggestions-list';
import type {TransformedSuggestion, SavedQuery} from '../../flow/Issue';
import {COLOR_PINK, COLOR_PLACEHOLDER} from '../../components/variables/variables';
import {clearSearch} from '../../components/icon/icon';
import Modal from 'react-native-root-modal';
import KeyboardSpacer from 'react-native-keyboard-spacer';
import throttle from 'lodash.throttle';

const SEARCH_THROTTLE = 30;
const INITIAL_OPACITY = 0.2;
const SHOW_LIST_ANIMATION_DURATION = 500;

type Props = {
  suggestions: Array<TransformedSuggestion | SavedQuery>,
  currentQuery: string,
  onSetQuery: (query: string) => any,
  onChange: (query: string, caret: number) => any,
};

type State = {
  displayCancelSearch: boolean,
  showQueryAssist: boolean,
  input: string,
  caret: number,
  queryCopy: string,
  suggestionsListTop: number,
  listShowAnimation: Object,
}

export default class QueryAssist extends React.Component {
  state: State;
  props: Props;
  queryAssistContainer: ?Object;
  lastQueryParams: {query: string, caret: number} = {query: '', caret: 0};

  constructor(props: Props) {
    super(props);
    this.state = {
      displayCancelSearch: false,
      showQueryAssist: false,
      input: '',
      caret: 0,
      queryCopy: '',
      suggestionsListTop: 0,
      listShowAnimation: new Animated.Value(INITIAL_OPACITY)
    };
  }

  blurInput() {
    this.refs.searchInput.blur();
  }

  cancelSearch() {
    this.blurInput();
    this.setState({input: this.state.queryCopy});
  }

  beginEditing() {
    let {input} = this.state;
    input = input || '';
    this.setState({
      showQueryAssist: true,
      displayCancelSearch: true,
      queryCopy: input,
      suggestionsListTop: 0
    });

    this.state.listShowAnimation.setValue(INITIAL_OPACITY);
    Animated.timing(this.state.listShowAnimation,{toValue: 1, duration: SHOW_LIST_ANIMATION_DURATION}).start();

    this.props.onChange(input, input.length);
  }

  stopEditing() {
    this.setState({
      showQueryAssist: false,
      displayCancelSearch: false
    });
  }

  onSubmitEditing() {
    this.blurInput();
    this.props.onSetQuery(this.state.input || '');
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps.currentQuery !== this.props.currentQuery) {
      this.setState({input: newProps.currentQuery});
    }
  }

  componentDidMount() {
    this.setState({input: this.props.currentQuery});
  }

  onSearch = throttle((query: string, caret: number) => {
    if (this.lastQueryParams.query === query || this.lastQueryParams.caret === caret) {
      return;
    }

    this.lastQueryParams = {query, caret};
    this.setState({input: query, caret});
    this.props.onChange(query, caret);

  }, SEARCH_THROTTLE)

  onApplySuggestion = (suggestion: TransformedSuggestion) => {
    const suggestionText = `${suggestion.prefix}${suggestion.option}${suggestion.suffix}`;
    const oldQuery = this.state.input || '';
    const newQuery = oldQuery.substring(0, suggestion.completionStart) + suggestionText + oldQuery.substring(suggestion.completionEnd);
    this.setState({input: newQuery});
  }

  onApplySavedQuery = (savedQuery: SavedQuery) => {
    this.blurInput();
    this.props.onSetQuery(savedQuery.query);
  }

  _renderInput() {
    const {input, showQueryAssist} = this.state;

    let cancelButton = null;
    if (this.state.displayCancelSearch) {
      cancelButton = <TouchableOpacity
        style={styles.cancelSearch}
        onPress={this.cancelSearch.bind(this)}>
        <Text style={styles.cancelText}>
          Cancel
        </Text>
      </TouchableOpacity>;
    }

    return (
      <View style={styles.inputWrapper} ref={node => this.queryAssistContainer = node}>
        <TextInput
          ref="searchInput"
          keyboardAppearance="dark"
          style={[styles.searchInput, showQueryAssist ? styles.searchInputActive : null]}
          placeholderTextColor={showQueryAssist ? COLOR_PLACEHOLDER : COLOR_PINK}
          placeholder="Enter query"
          clearButtonMode="while-editing"
          returnKeyType="search"
          autoCorrect={false}
          underlineColorAndroid="transparent"
          autoCapitalize="none"
          onFocus={() => this.beginEditing()}
          onBlur={() => this.stopEditing()}
          onSubmitEditing={() => this.onSubmitEditing()}
          value={input}
          onChangeText={text => this.setState({input: text})}
          onSelectionChange = {event => this.onSearch(input, event.nativeEvent.selection.start)}
        />
        {(input && showQueryAssist) ? <TouchableOpacity style={styles.clearIconWrapper} onPress={() => this.setState({input: ''})}>
          <Image style={styles.clearIcon} source={clearSearch}/>
        </TouchableOpacity> : null}
        {cancelButton}
      </View>
    );
  }

  _renderSuggestions() {
    const {suggestions} = this.props;
    return (
      <Animated.View style={[styles.listContainer, {opacity: this.state.listShowAnimation}]}>
        <QueryAssistSuggestionsList
          suggestions={suggestions}
          onApplySuggestion={this.onApplySuggestion}
          onApplySavedQuery={this.onApplySavedQuery}
        />
      </Animated.View>
    );
  }

  render() {
    const {showQueryAssist} = this.state;

    return (
      <View style={styles.placeHolder}>
        <Modal
          visible
          style={[styles.modal, showQueryAssist && styles.modalFullScreen]}
        >
          {showQueryAssist && this._renderSuggestions()}

          {this._renderInput()}

          {Platform.OS === 'ios' && <KeyboardSpacer style={styles.keyboardSpacer}/>}
        </Modal>
      </View>
    );
  }
}
