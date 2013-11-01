/**
 * @description Defines a new type.
 * @returns {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
var type = window.type = function( name )
{
    if ( arguments.length > 0 && types[ name ] !== undefined )
        return types[ name ];

    var Scope = null;
    var run = true;

    var Type = function()
    {
        if ( ( inits & TYPE_CHECK ) === TYPE_CHECK )
        {
            typeCheckResult = true;
            return;
        }
        if ( ( inits & SCOPE ) === SCOPE )
        {
            if ( Scope === null )
                Scope = defineScope( Type );
            var scope = { parent: null };
            if ( IE8 )
            {
                scope.self = document.createElement();
                applyPrototypeMembers( Scope, scope.self );
            }
            else
                scope.self = new Scope();
            return scope;
        }
        if ( ( inits & PUB ) === PUB && run )
        {
            var pub;
            run = false;
            if ( IE8 )
            {
                pub = document.createElement();
                applyPrototypeMembers( Type, pub );
            }
            else
                pub = new Type();
            init( Type, pub, arguments );
            run = true;
            return pub;
        }
    };

    if ( arguments.length > 0 )
        types[ name ] = Type;

    Type.members = {};
    Type.parent = null;
    Type.mixins = [];
    
    /**
     * @description Sets the base type.
     * @param {Type|function} Base
     * @returns {Type}
     */
    Type.extend = function( Base )
    {
        // Since name collision detection happens when the type is defined, we must prevent people
        // from changing the inheritance hierarchy after defining members.
        if ( keys( Type.members ).length > 0 )
            throw new Error( "Cannot change the base type after members have been defined." );

        if ( typeOf( Base ) === STRING )
            Base = type( Base );

        if ( !isFunc( Base ) )
            throw new Error( "Base type must be a function." );

        // Only set the parent member if the base type was created by us.
        if ( isTypeOurs( Base ) )
        {
            // Check for circular reference.
            var t = Base;
            while ( t )
            {
                if ( t === Type )
                    throw new Error( "Cannot inherit from " + ( Base === Type ? "self" : "derived type" ) + "." );
                t = t.parent;
            }

            Type.parent = Base;
        }

        inits &= ~PUB;
        Type.prototype = new Base();
        inits |= PUB;

        return Type;
    };

    /**
     * @description
     * Defines members on the type.
     *
     * Example: The following defines a public method `foo`, a private method `bar`, and a public
     * virtual method `baz` on the type `MyType`.
     *
        <pre>
          var MyType = type().def({
            foo: function() { },
            __bar: function() { },
            $baz: function() { }
          });
        </pre>
     *
     * @param {hash} members
     * @returns {Type}
     */
    Type.def = function( members )
    {
        each( members, function( member, name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === CTOR )
            {
                if ( isArray( member ) )
                {
                    Type.$inject = member;
                    member = member.pop();
                    if ( Type.$inject[0] === "..." )
                    {
                        if ( Type.parent === null || !Type.parent.$inject || Type.parent.$inject.length === 0 )
                            throw new Error( "The '...' syntax is invalid when a base type does not exist or has no dependencies." );
                        Type.$inject.splice( 0, 1 );
                        Type.$inject = Type.parent.$inject.concat( Type.$inject );
                    }
                }
                if ( !isFunc( member ) )
                    throw new Error( "Constructor must be a function." );
            }

            Type.members[ name ] = {
                access: info.access,
                isVirtual: info.isVirtual
            };

            if ( isFunc( member ) )
                defineMethod( Type, name, member );
            else
                defineProperty( Type, info, member );
        });

        return Type;
    };

    /**
     * @description Defines events on the type.
     * @param {array} events
     * @returns {Type}
     */
    Type.events = function( events )
    {
        each( events, function( name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === CTOR )
                throw new Error( "Event cannot be named 'ctor'." );

            if ( info.isVirtual )
                throw new Error( "Events cannot be virtual." );

            Type.members[ name ] = {
                access: info.access,
                isEvent: true
            };
        });
        return Type;
    };

    /**
     * @descriptions Mixes other types in with the type.
     * @param {array} types
     * @returns {Type}
     */
    Type.include = function( types )
    {
        each( types, function( mixin )
        {
            if ( typeOf( mixin ) === STRING )
                mixin = type( mixin );

            if ( !isTypeOurs( mixin ) )
                throw new Error( "Mixin must be a type." );

            if ( mixin === Type )
                throw new Error( "Cannot include self." );

            if ( mixin.members.ctor !== undefined && mixin.members.ctor.params.length > 0 )
                throw new Error( "Mixin cannot have dependencies." );

            checkMixinForCircularReference( Type, mixin );
            Type.mixins.push( mixin );
        });
        return Type;
    };

    return Type;
};

/**
 * @private
 * @description Checks mixin for circular references.
 * @param {Type} type
 * @param {Type} mixin
 */
function checkMixinForCircularReference( type, mixin )
{
    if ( type === mixin )
        throw new Error( "Cannot include type that includes self." );
    each( mixin.mixins, function( m )
    {
        checkMixinForCircularReference( type, m );
    });
}

/**
 * @private
 * @description Determines whether the type was created by us.
 * @param {function} type
 * @returns {boolean}
 */
function isTypeOurs( type )
{
    inits |= TYPE_CHECK;
    typeCheckResult = false;
    type();
    inits &= ~TYPE_CHECK;
    return typeCheckResult;
}

/**
 * @private
 * @description Creates a new private scope.
 * @param {Type} Type
 */
function defineScope( Type )
{
    var Scope = function() { };
    inits &= ~( PUB | SCOPE );
    Scope.prototype = new Type();
    inits |= PUB | SCOPE;

    var fn = Scope.prototype;

    /**
     * Creates a new instance of the type, but returns the private scope.
     * This allows access to private methods of other instances of the same type.
     */
    fn._new = function()
    {
        inits &= ~PUB;
        var ret = init( Type, new Type(), arguments );
        inits |= PUB;
        return ret;
    };

    /**
     * Gets the private scope of the type instance.
     */
    fn._pry = function( pub )
    {
        pry = Type;
        var scope = !!pub && !!pub.$scope && isFunc( pub.$scope ) ? pub.$scope() : null;
        pry = null;
        return scope || pub;
    };

    return Scope;
}

/**
 * @description Gets the member info by parsing the member name.
 * @param {string} name
 * @returns {object}
 */
function parseMember( name )
{        
    var twoLetter = name.substr( 0, 2 );

    // determines the member's visibility (public|private)
    var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ name[0] ] || PUBLIC;

    // determines whether the method can be overridden
    var isVirtual = IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ name[0] ] || false;

    // trim away the modifiers
    name = name.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ name[0] ] || 0 );

    // "ctor" is a special name for the constructor method
    if ( name === CTOR )
    {
        access = PRIVATE;
        isVirtual = false;
    }

    return {
        access: access,
        isVirtual: isVirtual,
        name: name
    };
}

/**
 * @description Checks the memeber info on a type and throws an error if invalid.
 * @param {Type} type
 * @param {object} info
 */
function validateMember( type, info )
{
    // check for name collision
    if ( isUsed( type, info.name ) )
        throw new Error( "Member '" + info.name + "' is already defined." );

    // make sure the access modifier isn't being changed
    if (
        info.access !== PRIVATE &&
        type.parent !== null &&
        type.parent.members[ info.name ] !== undefined &&
        type.parent.members[ info.name ].access !== info.access
    )
    {
        throw new Error( "Cannot change access modifier of member '" + name + "' from " +
            type.parent.members[ name ].access + " to " + info.access + "." );
    }
}

/**
 * @private
 * @description Checks if member name collides with another member.
 * @param {Type} type The type to check.
 * @param {string} name The member name.
 * @param {bool} [parent] True if the type being checked is a base type.
 * @returns {bool}
 */
function isUsed( type, name, parent )
{
    if (
        type.members[ name ] !== undefined &&
        ( !parent || type.members[ name ].access !== PRIVATE ) &&
        ( !parent || !type.members[ name ].isVirtual )
    )
        return true;
    if ( type.parent !== null )
        return isUsed( type.parent, name, true );
    return false;
}

/**
 * @private
 * @description Defines a method on the type.
 * @param {Type} type
 * @param {string} name
 * @param {function} method
 */
function defineMethod( type, name, method )
{
    var params = [];
    var match = method.toString().match( /^function\s*\(([^())]+)\)/ );
    if ( match !== null )
    {
        each( match[1].split( "," ), function( param, index )
        {
            params.push( trim( param ) );
        });
    }
    type.members[ name ].method = method;
    type.members[ name ].params = params;
    type.members[ name ].callsuper = fnTest.test( method );
}

/**
 * @private
 * @description Defines a property on the type.
 * @param {Type} Type
 * @param {string} name
 * @param {object} property
 */
function defineProperty( Type, info, property )
{
    if ( typeOf( property ) !== "object" )
        property = { value: property };

    var different = 0;

    // IE8 will actually enumerate over members added during an enumeration,
    // so we need to write to a temp object and copy the accessors over once
    // we're done.
    var temp = {};
    each( property, function( method, type )
    {
        type = type.toLowerCase();
        var twoLetter = type.substr( 0, 2 );
        if ( IS_VIRTUAL[ twoLetter ] || IS_VIRTUAL[ type[0] ] )
            throw new Error( "Property '" + info.name + "' cannot have virtual accessors." );

        var access = GET_ACCESS[ twoLetter ] || GET_ACCESS[ type[0] ] || info.access;
        if ( ACCESS[ access ] < ACCESS[ info.access ] )
            throw new Error( "The " + type + " accessor of the property '" + info.name + "' cannot have a lower access modifier than the property itself." );

        type = type.substr( GET_PREFIX[ twoLetter ] || GET_PREFIX[ type[0] ] || 0 );

        if ( type !== "get" && type !== "set" )
            return;

        if ( access !== info.access )
            different++;

        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] !== undefined &&
            Type.parent.members[ info.name ][ type ] !== undefined &&
            Type.parent.members[ info.name ][ type ].access !== access
        )
        {
            throw new Error( "Cannot change access modifier of '" + type + "' accessor for property '" + info.name +
                "' from " + Type.parent.members[ info.name ][ type ].access + " to " + access + "." );
        }

        if ( method !== null && !isFunc( method ) )
        {
            throw new Error( type.substr( 0, 1 ).toUpperCase() + type.substr( 1 ) + " accessor for property '" +
                info.name + "' must be a function or null (uses default implementation.)" );
        }
        
        temp[ type ] =
        {
            access: access,
            method: method
        };
    });
    property.get = temp.get;
    property.set = temp.set;

    if ( different === 2 )
        throw new Error( "Cannot set access modifers for both accessors of the property '" + info.name + "'." );

    if ( property.get === undefined && property.set === undefined )
    {
        property.get = { access: info.access };
        property.set = { access: info.access };
    }

    if ( property.get !== undefined && !isFunc( property.get.method ) )
    {
        property.get.method = function() {
            return this._value;
        };
    }
    if ( property.set !== undefined && !isFunc( property.set.method ) )
    {
        property.set.method = function( value ) {
            this._value = value;
        };
    }

    each([ property.get, property.set ], function( accessor, index )
    {
        if ( accessor === undefined ) return;

        var type = index === 0 ? "get" : "set";
        if (
            Type.parent !== null &&
            Type.parent.members[ info.name ] !== undefined &&
            Type.parent.members[ info.name ].access !== PRIVATE &&
            Type.parent.members[ info.name ][ type ] === undefined
        )
            throw new Error( "Cannot change read/write definition of property '" + info.name + "'." );

        Type.members[ info.name ][ type ] =
        {
            access: accessor.access,
            method: accessor.method,
            callsuper: fnTest.test( accessor.method )
        };
    });

    Type.members[ info.name ].value = property.value !== undefined ? property.value : null;
}

/**
 * @private
 * @param {Type} type
 * @param {object} obj
 */
function applyPrototypeMembers( type, obj )
{
    var proto = type.prototype;
    if ( proto.constructor.prototype !== proto )
        applyPrototypeMembers( proto.constructor, obj );
    for ( var prop in proto )
    {
        if ( proto.hasOwnProperty( prop ) )
            obj[ prop ] = proto[ prop ];
    }
}
