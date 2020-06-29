import React, { Component, ChangeEvent, FormEvent, Children } from 'react';
import { SyntaxError, parse } from './grammar';
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import './App.css';
import { type } from 'os';
import { AssertionError } from 'assert';

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
      content = <TableauView start={this.state.startFormula as Term}
        centerX={window.innerWidth / 2}
        startY={50.0} />
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

function copyTerm(t: Term) { return JSON.parse(JSON.stringify(t)) }
function substituteVar(t: Term, bounded: string, arg1: string): Term {
  return substitute(t, bounded, { op: "var", name: arg1, args: [], bind: undefined })
}

function substitute(t: Term, bounded: string, arg: Term): Term {
  switch (t.op) {
    case "not":
    case "imp":
    case "or":
    case "and":
    case "predicate":
      for (const key in t.args) {
        t.args[key] = substitute(t.args[key], bounded, arg)
      }
      break;

    case "var":
      if (t.name == bounded)
        return arg
      break;
    case "exists":
    case "forall":
      if (t.bind != bounded) {
        for (const key in t.args) {
          t.args[key] = substitute(t.args[key], bounded, arg)
        }
      }
  }
  return t
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
  id = "node-" + Math.ceil(100000 * Math.random())
  positive: boolean = true
  term: Term | null = null

  children: Array<PNode> = []
  pos: number = -1
  parent: PNode | null = null

  x: number = 0
  y: number = 0

  goal: boolean = false
  closed: boolean = false

  constructor(negated: boolean, term: Term | null) {
    this.term = term;
    this.positive = negated;
  }

  appendGoal() {
    let g = new PNode(false, null)
    g.goal = true
    this.children.push(g)
    return g
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
    return found
  }
}

interface TableauProps {
  start: Term
  centerX: number
  startY: number
}

interface TableauState {
  tree: PNode
}

class TableauView extends Component<TableauProps, TableauState> {
  componentWillMount() {
    const t = new PNode(false, this.props.start)
    const a = new PNode(false, null)
    a.goal = true
    t.children.push(a)
    this.setState({ tree: t })
  }

  DX = 50
  DY = 50

  maintain(node: PNode) {
    let goals = 0;
    const singleChild = node.children.length <= 1
    node.children.forEach((c, i) => {
      c.pos = i;
      c.parent = node;
      c.y = node.y + this.DY
      if (singleChild) {
        c.x = node.x
      } else {
        const mid = node.children.length / 2
        const pos = (i - mid)
        c.x = node.x - (pos * this.DX)
      }
      goals += this.maintain(c)
    })
    return goals == 0 ? 1 : goals
  }

  applyRule = (node: PNode, goal: PNode, r: Rule) => {
    const n = node.positive
    const t = node.term
    let parent = goal.parent

    if (t == null || parent == null) return;
    if (!r.applicable(n, t)) return
    let children = r.apply(n, t);
    if (r.type == "beta") {
      parent.children = children
      for (let c of children) c.appendGoal()
    } else {
      for (let c of children) {
        parent.children = [c]
        parent = c
      }
      parent.appendGoal()
    }
    this.forceUpdate(() => { this.componentDidMount() })
  }

  applyRuleAuto = (node: PNode) => {
    const n = node.positive
    const t = node.term
    if (t == null) return
    for (let r of RULES) {
      let b = r.applicable(n, t)
      if (b) {
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

  componentDidMount() {
    console.log("componentDidMount")
    const canvas: HTMLCanvasElement = document.getElementById("stage") as HTMLCanvasElement
    if (canvas == null) throw new AssertionError({ message: "canvas is null" })
    var ctx = canvas.getContext("2d")
    function connect(a: PNode, b: PNode) {
      console.log("connect", a, b);
      if (a == null || b == null) return
      if (ctx == null) throw new AssertionError({ message: "canvas is null" })
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    if (ctx == null) throw new AssertionError({ message: "ctx is null" })
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let n of this.state.tree.allChildren()) {
      //const a = document.getElementById(n.id)
      for (let c of n.children) {
        //const b = document.getElementById(c.id)
        connect(n, c)
      }
    }
  }

  render() {
    this.state.tree.x = this.props.centerX
    this.state.tree.y = this.props.startY
    this.maintain(this.state.tree);
    const allNodes = this.state.tree.allChildren();
    const innerNodes = allNodes.filter(i => !i.goal)
    const closedNodes = allNodes.filter(i => i.goal && i.closed)
    const goals = allNodes.filter(i => i.goal && !i.closed)

    return (<div className="tableau">
      <canvas id="stage" width={2000} height={1000}></canvas>
      {innerNodes.map(n => <NodeView node={n} />)}
      {goals.map(i => <GoalView applyRule={this.applyRule} node={i} />)}
      {closedNodes.map(i => <NodeView node={i} />)}
    </div>)
  }
}

function renderTerm(term: Term): JSX.Element {
  switch (term.op) {
    case "predicate":
      let args: Array<JSX.Element> = []
      if (term.args.length > 0) {
        const op = <span className={term.op}>, </span>
        args.push(<span>(</span>)
        term.args.map(t => renderTerm(t))
          .forEach((e, i) => {
            if (i != 0) args.push(op)
            args.push(e)
          })
        args.push(<span>)</span>)
      }
      return <span>{term.name as string}
        {args}</span>

    case "var":
      return <span>{term.name as string}</span>

    case "exists":
    case "forall":
      return (<span className="forall">
        {term.op == "forall" ? "∀" : "∃"}{term.bind}.
        {renderTerm(term.args[0])}
      </span>);

    case "imp":
    case "or":
    case "and":
      const opName =
        term.op == "and"
          ? "∧"
          : term.op == "or"
            ? "∨"
            : "⭢";

      const op = <span className={term.op}>{opName}</span>
      const elems: Array<JSX.Element> = [];
      term.args.map(t => renderTerm(t))
        .forEach((e, i) => {
          if (i != 0) elems.push(op)
          elems.push(e)
        })

      return (<span className="binary">{elems} </span>);

    case "not":
      return <span className="not">⌐ {renderTerm(term.args[0])}</span>
  }

  return <span>{term.op} not supported</span>
}

interface NodeProps {
  node: PNode
}

interface GoalProp extends NodeProps {
  applyRule: (node: PNode, goal: PNode, r: Rule) => void
}

interface GoalState { }

class GoalView extends Component<GoalProp, GoalState> {
  render() {
    const node: PNode = this.props.node
    const random = Math.random().toString()
    const divStyle = { "left": this.props.node.x + "px", "top": this.props.node.y + "px" };

    return (
      <div style={divStyle} className="goal">
        <RuleAppView text="&alpha;" rule={new AlphaRule()} goal={this.props.node} applyRule={this.props.applyRule} />
        <RuleAppView text="&beta;" rule={new BetaRule()} goal={this.props.node} applyRule={this.props.applyRule} />
        <RuleAppView text="&gamma;" rule={new GammaRule()} goal={this.props.node} applyRule={this.props.applyRule} />
        <RuleAppView text="&delta;" rule={new DeltaRule()} goal={this.props.node} applyRule={this.props.applyRule} />
      </div>
    )
  }
}

interface RuleAppProps {
  text: String
  rule: Rule
  goal: PNode
  applyRule: (node: PNode, goal: PNode, r: Rule) => void
}
interface RuleAppState { over: boolean; applicable: boolean }

class RuleAppView extends Component<RuleAppProps, RuleAppState> {
  componentWillMount() {
    this.setState({
      over: false,
      applicable: false
    });
  }

  handleDragStart = (e) => {

  }

  handleDragOver = (e) => {
    if (e.preventDefault) {
      e.preventDefault() // Necessary. Allows us to drop.
    }
    e.dataTransfer.dropEffect = 'link'  // See the section on the DataTransfer object.
    return false
  }

  handleDragEnter = (e) => {
    // this / e.target is the current hover target.
    let app = false
    if (draggedNode != null) {
      const [p, t] = [draggedNode.positive, draggedNode.term]
      if (t != null) {
        const app = this.props.rule.applicable(p, t)
        this.setState({ over: true, applicable: app })
      }
    }
  }

  handleDragLeave = (e) => {
    this.setState({ over: false })  // this / e.target is previous target element.
  }

  handleDrop = (e) => {
    // this / e.target is current target element.
    if (e.stopPropagation) {
      e.stopPropagation(); // stops the browser from redirecting.
    }
    if (draggedNode != null) {
      const [p, t] = [draggedNode.positive, draggedNode.term]
      const app = t != null && this.props.rule.applicable(p, t)
      this.props.applyRule(draggedNode, this.props.goal, this.props.rule)
    }
    this.setState({ over: false, applicable: false })
    // See the section on the DataTransfer object.
    return false;
  }

  handleDragEnd = (e) => {
    // this/e.target is the source node.
    this.setState({ over: false, applicable: false })
  }

  render() {
    const dragHandlers = {
      onDragStart: this.handleDragStart,
      onDrop: this.handleDrop,
      onDragLeave: this.handleDragLeave,
      onDragEnd: this.handleDragEnd,
      onDragEnter: this.handleDragEnter,
      onDragOver: this.handleDragOver
    }
    let classes = ""
    if (this.state.over)
      classes += this.state.applicable ? " over-ok" : " over-err";
    return <span {...dragHandlers} className={classes}>{this.props.text}</span>
  }
}

let draggedNode: null | PNode = null

interface NodeState {
  over: boolean
}

class NodeView extends Component<NodeProps, NodeState> {
  dragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const node: PNode = this.props.node
    draggedNode = node;
  }

  componentWillMount() {
    this.setState({
      over: false,
    });
  }

  handleDragOver = (e) => {
    if (e.preventDefault) {
      e.preventDefault() // Necessary. Allows us to drop.
    }
    e.dataTransfer.dropEffect = 'link'  // See the section on the DataTransfer object.
    return false
  }

  handleDragEnter = (e) => {
    // this / e.target is the current hover target.
    let app = false
    if (draggedNode != null) {
      const [p, t] = [draggedNode.positive, draggedNode.term]
      if (t != null) {
        //const app = this.props.rule.applicable(p, t)
        this.setState({ over: true })
      }
    }
  }

  handleDragLeave = (e) => {
    this.setState({ over: false })  // this / e.target is previous target element.
  }

  handleDrop = (e) => {
    // this / e.target is current target element.
    if (e.stopPropagation) {
      e.stopPropagation(); // stops the browser from redirecting.
    }
    if (draggedNode != null) {
      const [p, t] = [draggedNode.positive, draggedNode.term]
      //const app = t != null && this.props.rule.applicable(p, t)
      //this.props.applyRule(draggedNode, this.props.goal, this.props.rule)
    }
    this.setState({ over: false })
    // See the section on the DataTransfer object.
    return false;
  }

  handleDragEnd = (e) => {
    // this/e.target is the source node.
    this.setState({ over: false })
  }

  render() {
    const node: PNode = this.props.node
    const random = Math.random().toString()
    const divStyle = { "left": this.props.node.x + "px", "top": this.props.node.y + "px" };

    const dragHandlers = {
      onDragStart: this.dragStart,
      onDrop: this.handleDrop,
      onDragLeave: this.handleDragLeave,
      onDragLeaveCapture: this.handleDragLeave,
      onDragEnd: this.handleDragEnd,
      onDragEnter: this.handleDragEnter,
      onDragEnterCapture: this.handleDragEnter,
      onDragOver: this.handleDragOver,
      onDragOverCapture: this.handleDragOver
    }
    let classes = "node"
    if (this.state.over)
      classes += " over"

    const content = node.term != null ? <span>
      <span className="prefix">
        {!node.positive ? "0" : "1"}
      </span>
      {renderTerm(node.term)}
    </span> : <span>closed</span>;

    return (
      <div id={this.props.node.id} draggable="true" style={divStyle} className={classes} {...dragHandlers}>
        {content}
      </div>
    )
  }
}

class Rule {
  type: string = ""
  applicable(negated: boolean, term: Term): boolean { return false }
  apply(negated: boolean, term: Term): Array<PNode> { return [] }
}

class AlphaRule extends Rule {
  type = "alpha"

  applicable = (n, t) => {
    if (!n) {
      return t.op == 'or' || t.op == 'imp' || t.op == 'not'
    } else {
      return t.op == 'and' || t.op == 'not'
    }
  }
  apply = (n, t) => {
    const c1 = t.args[0]
    let p1 = new PNode(false, c1)
    let p2;
    if (t.args.length == 2) {
      const c2 = t.args[1]
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
}

/// drawing
function center(n: HTMLElement) {
  let centerX = n.offsetLeft + n.offsetWidth / 2;
  let centerY = n.offsetTop + n.offsetHeight / 2;
  return [centerX, centerY]
}

/// 


class BetaRule extends Rule {
  type = 'beta'
  applicable = (pos, t) => {
    if (pos) {
      return t.op == 'or' || t.op == 'imp'
    } else {
      return t.op == 'and'
    }
  }
  apply = (n, t) => {
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
}

class GammaRule extends Rule {
  type = 'gamma'
  applicable = (pos, t) => {
    if (pos) {
      return t.op == 'forall'
    } else {
      return t.op == 'exists'
    }
  }
  apply = (n, t) => {
    const bounded = t.bind
    if (bounded == undefined) throw new AssertionError()
    const c1 = copyTerm(t.args[0])
    const c2 = substituteVar(c1, bounded, bounded.toUpperCase() + "_" + (++globalVariableCounter))
    let p1 = new PNode(n, c2)
    return [p1]
  }
}

let globalVariableCounter = 0

class DeltaRule extends Rule {
  type = "delta";
  applicable = (pos, t) => {
    if (!pos) {
      return t.op == 'forall'
    } else {
      return t.op == 'exists'
    }
  }

  apply = (n, t: Term) => {
    const bounded = t.bind
    if (bounded == undefined) throw new AssertionError()
    const c1 = copyTerm(t.args[0])

    const freeVars: Array<Term> = [{ op: "var", name: "X", args: [], bind: undefined }]
    const skolemFun: Term = { op: "term", args: freeVars, name: "f" + (++globalVariableCounter), bind: undefined }

    const c2 = substitute(c1, bounded, skolemFun)
    let p1 = new PNode(n, c2)
    return [p1]
  }
}

const RULES: Array<Rule> = [new AlphaRule(),]

export default App;
