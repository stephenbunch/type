describe( "Class", function()
{
    describe( "type instantiation", function()
    {
        it( "should work without the `new` operator", function()
        {
            var A = type.Class({
                ctor: function( a, b, c ) {
                    result = a + b + c;
                }
            });
            var result = 0;
            var a = A( 1, 3, 5 );
            expect( result ).to.equal( 9 );
        });
    });

    describe( "`instanceof` operator", function()
    {
        it( "should work on the public interface (except in IE8)", function()
        {
            var A = type.Class();
            var B = A.extend();
            var C = B.extend();

            var a = new A();
            expect( a ).to.be.a( A );

            var b = new B();
            expect( b ).to.be.a( A );

            var c = new C();
            expect( c ).to.be.a( A );
        });

        it( "should work on the private scope", function()
        {
            var out = "";
            var A = type.Class({
                ctor: function() {
                    out += "a";
                    expect( this ).to.be.a( A );
                }
            });
            var B = A.extend({
                ctor: function() {
                    out += "b";
                    expect( this ).to.be.a( A );
                }
            });
            var C = B.extend({
                ctor: function() {
                    out += "c";
                    expect( this ).to.be.a( A );
                }
            });

            var a = new A();
            var b = new B();
            var c = new C();

            expect( out ).to.equal( "aababc" );
        });
    });

    describe( ".__scope__", function()
    {
        it( "should return undefined", function()
        {
            var A = type.Class();
            var a = new A();
            expect( a.__scope__ ).to.equal( undefined );
        });
    });

    describe( "<type>.extend()", function()
    {
        it( "should behave the same as .def({ extend: <type> })", function()
        {
            var Car = type.Class({
                $drive: function() {
                    return "vroom!";
                }
            });

            var AutopiaCar = Car.extend({
                $drive: function() {
                    return "I like to go " + this.$super();
                }
            });

            var car = new AutopiaCar();
            expect( car.drive() ).to.equal( "I like to go vroom!" );
        });
    });

    describe( "this", function()
    {
        describe( ".$pry()", function()
        {
            it( "should return the private scope of the given instance", function()
            {
                var A = type.Class({
                    bar: function( a ) {
                        return this.$pry( a ).foo();
                    },
                    __foo: function() {
                        return "hello";
                    }
                });
                var a1 = new A();
                var a2 = new A();
                expect( a2.bar( a1 ) ).to.equal( "hello" );
            });

            it( "should not be accessible on the public interface", function()
            {
                var A = type.Class();
                var a = new A();
                expect( a.$pry ).to.equal( undefined );
            });

            it( "should return input if failed", function()
            {
                var out = 0;
                var A = type.Class({
                    foo: function( test ) {
                        out = this.$pry( test );
                    }
                });
                var a = new A();
                a.foo( null );
                expect( out ).to.equal( null );

                a.foo( "hello" );
                expect( out ).to.equal( "hello" );
            });
        });

        describe( ".$pub", function()
        {
            it( "should return the public interface", function()
            {
                var A = type.Class({
                    bar: function() {
                        return this.$pub;
                    }
                });
                var a = new A();
                expect( a.bar() ).to.equal( a );
            });

            it( "should return the public interface of the child", function()
            {
                var A = type.Class({
                    bar: function() {
                        return this.$pub;
                    }
                });
                var B = A.extend();
                var b = new B();
                expect( b.bar() ).to.equal( b );
            });
        });

        describe( ".$super()", function()
        {
            it( "should call the parent method", function()
            {
                var A = type.Class({
                    $foo: function( message ) {
                        return message + " world";
                    }
                });
                var B = A.extend({
                    $foo: function( message ) {
                        return this.$super( message ) + "!";
                    }
                });
                var b = new B();
                expect( b.foo( "hello" ) ).to.equal( "hello world!" );
            });
        });

        describe( ".$value()", function()
        {
            it( "[set] should return the new value", function()
            {
                var out = null;
                var A = type.Class({
                    foo: {
                        get: null,
                        set: function( value ) {
                            out = this.$value( value );
                        }
                    }
                });
                var a = new A();
                a.foo = 2;
                expect( out ).to.equal( 2 );
            });
        });
    });
});
