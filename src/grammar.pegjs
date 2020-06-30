FormulaQ
  = prefix:(q:('forall' / 'exists') __ v:[a-zA-Z]+ _ '.' __)* 
    imp:FormulaImp 
    {    	
    	let value = imp;
        prefix.forEach((elem,id) => {
        	value = {'op':elem[0],
            		 'bind': elem[2].join(""),
            	   	 'args': [value] }
        
        });
    	return value;
    }
    
FormulaImp 
  = a:FormulaOr b:(_ '->' _ FormulaOr)* 
    {
    	if(b.length>0){
    	    const args = [a]
            b.forEach( (elem, id) => { args.push(elem[3]); });
    		return {'op':'imp', 'args' : args};
    	}
    	else return a;   
    }
  
FormulaOr 
  = a:FormulaAnd b:(('\\/' / '|')  FormulaAnd)*
    {
     	if(b.length > 0){
    		const args = [a]
            b.forEach( (elem, id) => { args.push(elem[3]); });
    		return {'op':'or', 'args' : args};
    	}
    	else return a;   
    }
    
  
FormulaAnd 
  = a:FormulaNot b:(_ ('/\\' / '&') _  FormulaNot)*
    {
    	if(b.length > 0){
        	const args = [a]
            b.forEach( (elem, id) => { args.push(elem[3]); });
    		return {'op':'and', 'args' : args};
    	}
    	else return a;   
    }
  
FormulaNot 
  = not:(('-'_) / ('not'__))? b:Predicate
    {
    	if(not) return {'op': 'not', 'child': [b]}
    	else return b;
    }
 
Predicate  
  = a:[a-zA-Z]+ args:('(' _ Term _ (',' _ Term _ )* ')')?
  	{
    	
    	return {'op': 'predicate', 'name': a.join(""), 'args': 
        	args != null
        	? args.filter(i => typeof(i)!="string" && i.length!=0)
            : []
        }
    }  
  / a:Term _ '=' _ b:Term
  	{
    	return {'op': 'predicate', 'name': "eq", 'args': [a,b] }
    }	
  / '(' _ a:FormulaQ _ ')'
  	{
    	return a
    }	
Term
  = func:[a-zA-Z]+ args:('(' _ Term (_ ',' _ Term)* _ ')')?
  	{
    	return {'op': 'term', 'name': func.join(""), 'args': 
            args != null 
        	? args.filter(i => typeof(i)!="string" && i.length!=0)
            : []
        }
    }	
    
// optional whitespace
_  = [ \t\r\n]*

// mandatory whitespace
__ = [ \t\r\n]+