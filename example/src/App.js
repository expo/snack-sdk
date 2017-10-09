import React, { Component } from 'react';
import './App.css';
import { SnackSession } from 'snack-sdk';
import QRCode from 'qrcode.react';

const INITIAL_APP_CODE = `
import React, { Component } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Constants } from 'expo';
import Panel from './Panel';

export default class App extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.paragraph}>
          Change code in the editor and watch it change on your phone!
          Save to get a shareable url. You get a new url each time you save.
        </Text>
        <Panel />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#ecf0f1',
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#34495e',
  },
});
`;
const INITIAL_PANEL_CODE = `
import React, { Component } from 'react';
import { Text, View, StyleSheet } from 'react-native';

export default class Panel extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.paragraph}>
          File: Panel.js
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'red',
    backgroundColor: 'green',
  },
});
`;

let files = {
  'app.js': {
    contents: INITIAL_APP_CODE,
    type: 'CODE'
  },
  'Panel.js': {
    contents: INITIAL_PANEL_CODE,
    type: 'CODE'
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    
    this._snack = new SnackSession({
      files,
      // sessionId is optional, will be assigned a random value if not specified
      sessionId: Math.random().toString(36).substr(2, 8),
      sdkVersion: '21.0.0',
    });

    this._logSubscription = this._snack.addLogListener(this._onLog);
    this._errorSubscription = this._snack.addErrorListener(this._onError);
    this._presenceSubscription = this._snack.addPresenceListener(
      this._onPresence
    );

    this.state = {
      url: '',
      files,
      log: null,
      error: null,
      presence: null,
      saveUrl: null,
    };
  }

  componentWillMount() {
    this._startSnack();
  }

  async _startSnack() {
    await this._snack.startAsync();
    let url = await this._snack.getUrlAsync();
    this.setState({
      url,
    });
  }

  _onChangeCode = async (event, fileName) => {
    const code = event.target.value;
    this.setState({
      files: {
        ...this.state.files,
        [fileName]: code,
      }
      
    });
    await this._snack.sendCodeAsync({
      [fileName]: { contents: code, type: 'CODE'}
    });
  };

  _onLog = log => {
    this.setState({
      log: JSON.stringify(log, null, 2),
    });
  };

  _onError = error => {
    this.setState({
      error: JSON.stringify(error, null, 2),
    });
  };

  _onPresence = presence => {
    this.setState({
      presence: JSON.stringify(presence, null, 2),
    });
  };

  _removeListeners = () => {
    this._logSubscription.remove();
    this._errorSubscription.remove();
    this._presenceSubscription.remove();
  };

  _save = async () => {
    let saveResult = await this._snack.saveAsync();
    this.setState({
      saveUrl: saveResult.url,
    });
  };

  render() {
    return (
      <div>
        <div>{this.state.url}</div>
        <div style={{ padding: 20 }}>
          <QRCode value={this.state.url} />
        </div>
        <div style={{display: 'flex',flexDirection: 'row' }}>
        {Object.keys(this.state.files).map(fileName => {
          return <div key={fileName}>
                <div><strong>{fileName}</strong></div>
                <textarea
                  value={this.state.files[fileName].contents}
                  onChange={ (e) => this._onChangeCode(e, fileName)}
                  style={{ width: 300, height: 300 }}
                />
            </div>
        })}
        </div>
        <div>
          Last log:
          <pre>
            {this.state.log}
          </pre>
        </div>
        <div>
          Last error:
          <pre>
            {this.state.error}
          </pre>
        </div>
        <div>
          Last presence event:
          <pre>
            {this.state.presence}
          </pre>
        </div>
        <div>
          <a href="#removeListeners" onClick={this._removeListeners}>
            Remove Listeners
          </a>
        </div>
        <div>
          <a href="#save" onClick={this._save}>
            Save
          </a>
        </div>
        <div>
          Save url: {this.state.saveUrl}
        </div>
        {this.state.saveUrl &&
          <div style={{ padding: 20 }}>
            <QRCode value={this.state.saveUrl} />
          </div>}
      </div>
    );
  }
}

export default App;
