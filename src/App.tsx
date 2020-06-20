import React, { Component, ChangeEvent, FormEvent } from 'react';
import { SyntaxError, parse } from './grammar';
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import './App.css';

interface AppState {
  formulaEntered: boolean,
  startFormula: Term | null
}

class App extends Component<{}, AppState> {
  componentWillMount() {
    this.setState({
      formulaEntered: false
    });
  }
  componentDidMount() { }


  onFormulaEntered = (txt: String, parsed: Term) => {
    console.log(txt)
    this.setState({
      "formulaEntered": true,
      "startFormula": parsed
    });
  }

  render() {
    let content = <div>empty</div>;

    if (!this.state.formulaEntered) {
      content = <EnterFormulaView ready={this.onFormulaEntered} />
    } else {
      content = <TableauView start={this.state.startFormula as Term} />
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

interface Term {
  op: string
  bind: string | void
  name: string | void
  args: Array<Term>
}

interface EnterFormulaState {
  value: string
  valid: boolean
  message: string | null
  parsed: Term | null
}

interface EnterFormulaProps {
  ready: (txt: String, parsed: Term) => void
}

class EnterFormulaView
  extends Component<EnterFormulaProps, EnterFormulaState> {

  componentWillMount() {
    this.update("(forall x. p(x)) -> (exists y. p(y))")
  }
  componentDidMount() { }

  update(newValue: string) {
    try {
      const parsed = parse(newValue) as Term;

      this.setState({
        value: newValue,
        valid: true,
        parsed: parsed,
        message: null
      })
    }
    catch (ex) {
      this.setState({
        value: newValue, valid: false,
        parsed: null,
        message: ex.message
      })
    }
  }

  onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    this.update(newValue)
  }

  onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log(this.state)
    if (this.state.valid && this.state.parsed != null) {
      this.props.ready(this.state.value, this.state.parsed)
    }

  }

  render() {
    return (
      <div id="enterFormula">
        <form onSubmit={this.onSubmit}>
          <label htmlFor="txt">Enter Formula:</label>
          <br />
          <input id="txt" type="text"
            className={this.state.valid ? "valid" : "not-valid"}
            value={this.state.value}
            onChange={this.onChange}
          />
          <br />
          <input type="submit" value="Start" />
        </form>
      </div>
    );
  }
}

class PNode {
  positive: boolean = true
  term: Term

  children: Array<PNode> = []
  pos: number = -1
  parent: PNode | null = null

  x: number = 0
  y: number = 0

  constructor(negated: boolean, term: Term) {
    this.term = term;
    this.positive = negated;
  }

  allChildren(): Array<PNode> {
    const queue: Array<PNode> = [this];
    const found: Array<PNode> = [];
    while (queue.length != 0) {
      const cur = queue.pop()
      if (cur === undefined || found.includes(cur)) continue;      
      found.push(cur)
      cur.children.forEach(i => queue.push(i))
    }
    console.log(found)
    return found
  }
}

interface TableauProps {
  start: Term
}

interface TableauState {
  tree: PNode
}

class TableauView extends Component<TableauProps, TableauState> {
  componentWillMount() {
    const t = new PNode(false, this.props.start)
    this.setState({ tree: t })
  }

  DX = 50
  DY = 25

  maintain(node: PNode) {
    console.log("maintain")
    let goals = 0;
    node.children.forEach((c, i) => {
      c.pos = i;
      c.parent = node;
      c.y = node.y + this.DY
      goals += this.maintain(c)

      if (node.children.length == 1) {
        c.x = node.x
      } else {
        const mid = node.children.length / 2
        const pos = (i - mid)
        c.x = node.x - (pos * this.DX)
      }
    })
    return goals == 0 ? 1 : goals
  }

  applyRule = (node: PNode) => {
    const n = node.positive
    const t = node.term
    for (let r of RULES) {
      let b = r.applicable(n, t)
      if (b) {
        console.log("apply ", r.type)
        let children = r.apply(n, t);
        if (r.type == "beta") {
          node.children = children
        } else {
          for (let c of children) {
            node.children = [c]
            node = c
          }
        }
        this.forceUpdate()
        break;
      }
    }
  }

  render() {
    this.state.tree.x = 512
    console.log("rebder")
    this.maintain(this.state.tree);

    return (<div className="tableau">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
        <g transform="translate(0 20)">
          {this.state.tree.allChildren().map(i => <NodeView
            applyRule={this.applyRule} node={i} />)}
        </g>
      </svg>
    </div>)
  }
}

interface NodeProps {
  node: PNode
  applyRule: (PNode) => void
}

class NodeView extends Component<NodeProps> {

  showMenu = (e) => {

  }

  handleClick = (e: React.MouseEvent<SVGElement, MouseEvent>) => {
    this.props.applyRule(this.props.node)
  }

  render() {
    const node: PNode = this.props.node
    const random = Math.random().toString()
    return (
      <g dy="20" onClick={this.handleClick}>
        <text x={this.props.node.x} y={this.props.node.y}
          textAnchor="middle"
          className="node">
          <tspan className="prefix">
            {!node.positive ? "0" : "1"}
          </tspan>
          {this.renderTerm(node.term)}
        </text>
      </g>
      /*<span>
        <ContextMenuTrigger id={random}>
          <span className="node" onClick={this.showMenu}>
            <strong className="prefix">
              {!node.positive ? "0" : "1"}
            </strong>

            {this.renderTerm(node.term)}
          </span>
        </ContextMenuTrigger>


        <ContextMenu id={random}>
          <MenuItem data={{ foo: 'bar' }} onClick={this.handleClick}>
            ContextMenu Item 1
        </MenuItem>
          <MenuItem data={{ foo: 'bar' }} onClick={this.handleClick}>
            ContextMenu Item 2
        </MenuItem>
          <MenuItem divider />
          <MenuItem data={{ foo: 'bar' }} onClick={this.handleClick}>
            ContextMenu Item 3
        </MenuItem>
        </ContextMenu></span >*/
    )
  }


  renderTerm(term: Term): JSX.Element {
    switch (term.op) {
      case "predicate":
        let args: Array<JSX.Element> = []
        if (term.args.length > 0) {
          const op = <tspan className={term.op}>, </tspan>
          args.push(<tspan>(</tspan>)
          term.args.map(t => this.renderTerm(t))
            .forEach((e, i) => {
              if (i != 0) args.push(op)
              args.push(e)
            })
          args.push(<tspan>)</tspan>)
        }
        return <tspan>{term.name as string}
          {args}</tspan>

      case "var":
        return <tspan>{term.name as string}</tspan>

      case "exists":
      case "forall":
        return (<tspan className="forall">
          {term.op == "forall" ? "∀" : "∃"}{term.bind}.
          {this.renderTerm(term.args[0])}
        </tspan>);

      case "imp":
      case "or":
      case "and":
        const opName =
          term.op == "and"
            ? "∧"
            : term.op == "or"
              ? "∨"
              : "⭢";

        const op = <tspan className={term.op}>{opName}</tspan>
        const elems: Array<JSX.Element> = [];
        term.args.map(t => this.renderTerm(t))
          .forEach((e, i) => {
            if (i != 0) elems.push(op)
            elems.push(e)
          })

        return (<tspan className="binary">{elems} </tspan>);

      case "not":
        return <tspan className="not">⌐ {this.renderTerm(term.args[0])}</tspan>
    }

    return <tspan>{term.op} not supported</tspan>
  }
}

interface Rule {
  type: string

  applicable(negated: boolean, term: Term): boolean
  apply(negated: boolean, term: Term): Array<PNode>
}

const RULES: Array<Rule> = [
  //alpha regeln 
  {
    'type': 'alpha',
    'applicable': (n, t) => {
      if (!n) {
        return t.op == 'or' || t.op == 'imp' || t.op == 'not'
      } else {
        return t.op == 'and' || t.op == 'not'
      }
    },
    'apply': (n, t) => {
      const c1 = t.args[0]
      console.log(c1)
      let p1 = new PNode(false, c1)
      let p2;
      if (t.args.length == 2) {
        const c2 = t.args[1]
        console.log(c2)
        p2 = new PNode(false, c2)
      } else {
        p2 = p1
      }

      switch (t.op) {
        case "and":
          p1.positive = true;
          p2.positive = true;
          break;
        case "imp":
          p1.positive = true;
          break;
        case "not":
          p1.positive = !n;
          p2.positive = !n;
          break;
      }


      if (t.op != "not") {
        return [p1, p2]
      }
      else {
        return [p1]
      }
    }
  },

  {
    'type': 'beta',
    'applicable': (pos, t) => {
      if (pos) {
        return t.op == 'or' || t.op == 'imp'
      } else {
        return t.op == 'and'
      }
    },
    'apply': (n, t) => {
      const c1 = t.args[0]
      let p1 = new PNode(false, c1)
      const c2 = t.args[1]
      let p2 = new PNode(false, c2)

      switch (t.op) {
        case "or":
          p1.positive = true;
          p2.positive = true;
          break;
        case "imp":
          p1.positive = false;
          p2.positive = true;
          break;
      }
      return [p1, p2]
    }
  },

  {
    'type': 'gamma',
    'applicable': (pos, t) => {
      if (pos) {
        return t.op == 'forall'
      } else {
        return t.op == 'exists'
      }
    },
    'apply': (n, t) => {
      const c1 = t.args[0]
      let p1 = new PNode(n, c1)
      return [p1]
    }
  },

  {
    'type': 'delta',
    'applicable': (pos, t) => {
      if (!pos) {
        return t.op == 'forall'
      } else {
        return t.op == 'exists'
      }
    },
    'apply': (n, t) => {
      const c1 = t.args[0]
      let p1 = new PNode(n, c1)
      return [p1]
    }
  }
]


export default App;
