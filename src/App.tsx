import React, { Component, ChangeEvent } from 'react';
import './App.css';

interface AppState {
  formulaEntered: boolean,
  tableau: Array<any>
}

class App extends Component<{}, AppState> {
  componentWillMount() {
    this.setState({
      formulaEntered: false,
      tableau: []
    });
  }
  componentDidMount() { }


  render() {
    let content = <div>empty</div>;

    if (!this.state.formulaEntered) {
      content = <EnterFormulaView />
    }

    return (
      <div className="App">
        <header className="App-header">
          Tableau App
          </header>
        {content}
      </div>
    );
  }
}

interface EnterFormulaState {
  value: string
  valid: boolean
}

class EnterFormulaView extends Component<{}, EnterFormulaState> {
  componentWillMount() {
    this.setState({
      value: "", valid: false
    })
  }
  componentDidMount() { }

  onChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ value: e.currentTarget.value })
  }

  render() {
    return (
      <div id="enterFormula">
        <form>
          <label htmlFor="txt">Enter Formula:</label>
          <br />
          <input id="txt" type="text"
            className={this.state.valid?"valid":"not-valid"}
            value={this.state.value}
            onChange={this.onChange}
          />
          <br />
          <input type="submit" value="Start"/>
        </form>
      </div>
    );
  }
}

export default App;
