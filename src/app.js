bb.app =
    bb.type().
    def(
    {
        ctor: function()
        {
            this.container = {};
            this.namespace = null;
        },

        /**
         * @description Registers a service.
         * @param {string} service
         * @param {function} factory
         * @returns {App}
         */
        register: function( service, factory )
        {
            var self = this;
            var bindings;
            if ( arguments.length === 1 )
                bindings = service;
            else
            {
                bindings = {};
                bindings[ service ] = factory;
            }
            bb.each( bindings, function( factory, service )
            {
                if ( self.container[ service ] !== undefined )
                    throw new Error( "The service \"" + service + "\" has already been bound." );
                if ( !bb.isFunc( factory ) )
                    throw new Error( "The factory to create the service \"" + service + "\" must be a function." );

                self.container[ service ] = {
                    create: factory,
                    inject: self.getDependencies( factory )
                };
            });
            return self._pub;
        },

        /**
         * @description Unregisters a service.
         * @param {string} service
         * @returns {App}
         */
        unregister: function( service )
        {
            delete this.container[ service ];
            return this._pub;
        },

        /**
         * @description Resolves a service and its dependencies.
         * @param {string|function|array} service
         * @param {params object[]} args
         * @returns {object}
         */
        resolve: function( service /*, arg0, arg1, arg2, ... */ )
        {
            var self = this;
            var binding = null;
            if ( bb.isFunc( service ) )
            {
                binding = {
                    create: service,
                    inject: self.getDependencies( service )
                };
            }
            else if ( bb.isArray( service ) )
            {
                binding = {
                    create: service.pop(),
                    inject: service
                };
            }
            else
            {
                if ( self.container[ service ] === undefined )
                {
                    if ( bb.typeOf( service ) === "string" && self.namespace !== null )
                    {
                        var names = service.split( "." );
                        var svc = names.pop();
                        var ns = bb.ns( names.join( "." ), self.namespace );
                        if ( ns[ svc ] !== undefined && bb.isFunc( ns[ svc ] ) )
                        {
                            binding = {
                                create: ns[ svc ],
                                inject: self.getDependencies( ns[ svc ] )
                            };
                        }
                    }
                    if ( binding === null )
                        throw new Error( "Service \"" + service + "\" not found." );
                }
                else
                    binding = self.container[ service ];
            }
            var dependencies = [];
            bb.each( binding.inject, function( dependency )
            {
                dependencies.push( self.resolve( dependency ) );
            });
            var args = makeArray( arguments );
            args.shift( 0 );
            args = dependencies.concat( args );
            return binding.create.apply( binding, args );
        },

        /**
         * @description Enables automatic binding to a namespace.
         * @param {object} namespace
         * @returns {App}
         */
        use: function( namespace )
        {
            this.namespace = namespace;
            return this._pub;
        },

        /**
         * @description Binds a constant to a service.
         * @param {string} service
         * @param {mixed} constant
         * @returns {App}
         */
        constant: function( service, constant )
        {
            var self = this;
            if ( arguments.length === 1 )
            {
                bb.each( service, function( constant, service )
                {
                    self.register( service, function() { return constant; } );
                });
                return self._pub;
            }
            else
                return self.register( service, function() { return constant; } );
        },

        /**
         * @description Loads a bubble.
         * @param {params string[]} bubbles
         * @returns {App}
         */
        require: function( bubbles /*, arg1, arg2, ... */ )
        {
            var self = this;
            bb.each( arguments, function( bubble )
            {
                bb.run( bubble, self._pub );
            });
            return self._pub;
        },

        __getDependencies: function( method )
        {
            var inject = [];
            if ( method.$inject !== undefined )
                inject = method.$inject;
            return inject;
        }
    });